# database.py - ENHANCED VERSION with Croatian tariffs and building types
import sqlite3
import pandas as pd
import json
from pathlib import Path
import numpy as np
from datetime import datetime

class V2BDatabase:
    def __init__(self, db_path='v2b_system.db', output_dir='extracted_data'):
        self.conn = sqlite3.connect(db_path)
        self.db_path = db_path
        self.output_dir = output_dir
        self.create_tables()
        
    def create_tables(self):
        """Kreiraj sve potrebne tablice"""
        
        # 1. Building profil
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS building_load (
                timestamp INTEGER PRIMARY KEY,
                power_kw REAL,
                date TEXT,
                time_slot INTEGER
            )
        ''')
        
        # 2. PV profil
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS pv_generation (
                timestamp INTEGER PRIMARY KEY,
                power_kw REAL,
                date TEXT,
                time_slot INTEGER
            )
        ''')
        
        # 3. EV katalog
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS ev_catalog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model TEXT,
                battery_kwh REAL,
                max_range_km REAL,
                charging_power_kw REAL
            )
        ''')
        
        # 4. Charger katalog
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS charger_catalog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                power_kw REAL,
                efficiency REAL
            )
        ''')
        
        # 5. EV behavior schedule
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS ev_schedule (
                ev_id INTEGER PRIMARY KEY,
                arrival_slot INTEGER,
                departure_slot INTEGER,
                initial_soc REAL,
                required_soc REAL,
                trip_distance_km REAL,
                ev_model_id INTEGER,
                FOREIGN KEY (ev_model_id) REFERENCES ev_catalog(id)
            )
        ''')
        
        # 6. Tariff
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS tariff (
                time_slot INTEGER PRIMARY KEY,
                hour INTEGER,
                period TEXT,
                price_kwh REAL
            )
        ''')
        
        # 7. Simulation results
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS simulation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                building_load REAL,
                pv_generation REAL,
                ev_charging REAL,
                ev_discharging REAL,
                grid_power REAL,
                total_cost REAL
            )
        ''')
        
        self.conn.commit()
        print("Tablice kreirane uspjesno")
    
    def load_csv_data(self):
        """Ucitaj podatke iz CSV fileova"""
        
        data_dir = Path('extracted_data')
        
        if not data_dir.exists():
            print("WARNING: Folder 'extracted_data' ne postoji!")
            return
        
        # Building profile
        building_file = data_dir / 'building_profile.csv'
        if building_file.exists():
            try:
                df = pd.read_csv(building_file)
                df.to_sql('building_load', self.conn, if_exists='replace', index=False)
                print(f"Ucitan building_profile.csv ({len(df)} redaka)")
            except Exception as e:
                print(f"ERROR pri ucitavanju building_profile.csv: {e}")
        else:
            print("WARNING: Nedostaje building_profile.csv")
        
        # PV profile
        pv_file = data_dir / 'pv_profile.csv'
        if pv_file.exists():
            try:
                df = pd.read_csv(pv_file)
                df.to_sql('pv_generation', self.conn, if_exists='replace', index=False)
                print(f"Ucitan pv_profile.csv ({len(df)} redaka)")
            except Exception as e:
                print(f"ERROR pri ucitavanju pv_profile.csv: {e}")
        else:
            print("WARNING: Nedostaje pv_profile.csv")
        
        # EV catalog
        ev_file = data_dir / 'ev_catalog.csv'
        if ev_file.exists():
            try:
                df = pd.read_csv(ev_file)
                df.to_sql('ev_catalog', self.conn, if_exists='replace', index=False)
                print(f"Ucitan ev_catalog.csv ({len(df)} modela)")
            except Exception as e:
                print(f"ERROR pri ucitavanju ev_catalog.csv: {e}")
        else:
            print("WARNING: Nedostaje ev_catalog.csv")
        
        # Charger catalog
        charger_file = data_dir / 'charger_catalog.csv'
        if charger_file.exists():
            try:
                df = pd.read_csv(charger_file)
                df.to_sql('charger_catalog', self.conn, if_exists='replace', index=False)
                print(f"Ucitan charger_catalog.csv ({len(df)} punjaca)")
            except Exception as e:
                print(f"ERROR pri ucitavanju charger_catalog.csv: {e}")
        else:
            print("WARNING: Nedostaje charger_catalog.csv")
        
        # EV behavior - POBOLJSANA LOGIKA
        ev_behavior_file = data_dir / 'ev_behavior_profiles.csv'
        if ev_behavior_file.exists():
            try:
                df_raw = pd.read_csv(ev_behavior_file)
                print(f"Ucitavam ev_behavior_profiles.csv...")
                print(f"  Kolone: {list(df_raw.columns)}")
                
                # Mapiranje kolona - FLEKSIBILNO
                df_mapped = pd.DataFrame()
                
                # EV ID
                if 'vehicle_id' in df_raw.columns:
                    df_mapped['ev_id'] = df_raw['vehicle_id'].str.extract(r'(\d+)').astype(int)
                elif 'ev_id' in df_raw.columns:
                    df_mapped['ev_id'] = df_raw['ev_id']
                else:
                    df_mapped['ev_id'] = range(1, len(df_raw) + 1)
                
                # Arrival slot
                if 'arrival_hour' in df_raw.columns:
                    df_mapped['arrival_slot'] = (df_raw['arrival_hour'] * 4).astype(int)
                elif 'arrival_slot' in df_raw.columns:
                    df_mapped['arrival_slot'] = df_raw['arrival_slot'].astype(int)
                else:
                    df_mapped['arrival_slot'] = 34  # Default: 8:30
                
                # Departure slot
                if 'departure_hour' in df_raw.columns:
                    df_mapped['departure_slot'] = (df_raw['departure_hour'] * 4).astype(int)
                elif 'departure_slot' in df_raw.columns:
                    df_mapped['departure_slot'] = df_raw['departure_slot'].astype(int)
                else:
                    df_mapped['departure_slot'] = 74  # Default: 18:30
                
                # Initial SOC
                if 'initial_soc' in df_raw.columns:
                    df_mapped['initial_soc'] = df_raw['initial_soc']
                elif 'soc' in df_raw.columns:
                    df_mapped['initial_soc'] = df_raw['soc']
                else:
                    df_mapped['initial_soc'] = np.random.uniform(0.2, 0.8, len(df_raw))
                
                # Required SOC
                if 'target_soc' in df_raw.columns:
                    df_mapped['required_soc'] = df_raw['target_soc']
                elif 'required_soc' in df_raw.columns:
                    df_mapped['required_soc'] = df_raw['required_soc']
                else:
                    df_mapped['required_soc'] = np.random.uniform(0.8, 0.9, len(df_raw))
                
                # Trip distance
                if 'daily_distance_km' in df_raw.columns:
                    df_mapped['trip_distance_km'] = df_raw['daily_distance_km']
                elif 'trip_distance_km' in df_raw.columns:
                    df_mapped['trip_distance_km'] = df_raw['trip_distance_km']
                else:
                    df_mapped['trip_distance_km'] = np.random.uniform(30, 70, len(df_raw))
                
                # EV model_id
                if 'model' in df_raw.columns:
                    model_map = {
                        'Corsa-e': 1,
                        'Megane E-Tech': 2,
                        'Zoe': 3,
                        'Renault Zoe': 3,
                        'Opel Corsa-e': 1,
                        'Renault Megane': 2
                    }
                    df_mapped['ev_model_id'] = df_raw['model'].map(model_map).fillna(1).astype(int)
                elif 'ev_model_id' in df_raw.columns:
                    df_mapped['ev_model_id'] = df_raw['ev_model_id']
                else:
                    df_mapped['ev_model_id'] = np.random.randint(1, 4, len(df_raw))
                
                # Spremi u bazu
                df_mapped.to_sql('ev_schedule', self.conn, if_exists='replace', index=False)
                print(f"Ucitan ev_behavior_profiles.csv ({len(df_mapped)} vozila)")
                
            except Exception as e:
                print(f"ERROR pri ucitavanju ev_behavior_profiles.csv: {e}")
                print("Generiranje default EV schedule...")
                self._generate_default_ev_schedule(50)
        else:
            print("WARNING: Nedostaje ev_behavior_profiles.csv")
            print("Generiranje default EV schedule...")
            self._generate_default_ev_schedule(50)
    
    def _generate_default_ev_schedule(self, num_evs=50):
        """Generiraj default EV schedule ako CSV ne postoji"""
        try:
            # Gaussova distribucija
            arrivals = np.random.normal(loc=34, scale=4, size=num_evs).astype(int)
            arrivals = np.clip(arrivals, 28, 40)  # 7:00-10:00
            
            departures = np.random.normal(loc=74, scale=8, size=num_evs).astype(int)
            departures = np.clip(departures, 64, 84)  # 16:00-21:00
            
            df = pd.DataFrame({
                'ev_id': range(1, num_evs + 1),
                'arrival_slot': arrivals,
                'departure_slot': departures,
                'initial_soc': np.random.uniform(0.2, 0.8, num_evs),
                'required_soc': np.random.uniform(0.8, 0.9, num_evs),
                'trip_distance_km': np.random.uniform(30, 70, num_evs),
                'ev_model_id': np.random.randint(1, 4, num_evs)
            })
            
            df.to_sql('ev_schedule', self.conn, if_exists='replace', index=False)
            print(f"Generirano {num_evs} default EV vozila")
            
        except Exception as e:
            print(f"ERROR pri generiranju default schedule: {e}")
    
    def load_tariff(self, use_croatian=True):
        """Ucitaj tariffne podatke"""
        
        if use_croatian:
            tariffs = self.load_croatian_tariff()
        else:
            tariff_file = Path('extracted_data/hep_tariff.json')
            
            if tariff_file.exists():
                try:
                    with open(tariff_file, 'r') as f:
                        tariff_data = json.load(f)
                    
                    # Ako je dict format
                    if isinstance(tariff_data, dict) and 'off_peak' in tariff_data:
                        tariffs = self._create_tariff_from_dict(tariff_data)
                    
                    # Ako je lista
                    elif isinstance(tariff_data, list):
                        tariffs = self._create_tariff_from_list(tariff_data)
                    
                    else:
                        tariffs = self._create_default_tariff()
                    
                    print("Ucitan hep_tariff.json")
                    
                except Exception as e:
                    print(f"ERROR pri ucitavanju hep_tariff.json: {e}")
                    tariffs = self._create_default_tariff()
            
            else:
                print("WARNING: Nedostaje hep_tariff.json, koristim default")
                tariffs = self._create_default_tariff()
        
        self.conn.executemany('''
            INSERT OR REPLACE INTO tariff (time_slot, hour, period, price_kwh)
            VALUES (?, ?, ?, ?)
        ''', tariffs)
        
        self.conn.commit()
    
    def load_croatian_tariff(self, tariff_file='croatian_tariff.json'):
        """Ucitaj hrvatsku dinamicku tarifu"""
        
        tariff_path = Path(tariff_file)
        
        if not tariff_path.exists():
            print(f"WARNING: {tariff_file} ne postoji, koristim default")
            return self._create_default_tariff()
        
        try:
            with open(tariff_path, 'r', encoding='utf-8') as f:
                tariff_data = json.load(f)
            
            print(f"Ucitana hrvatska tarifa: {tariff_data['tariff_name']}")
            
            # Mapiranje sati prema zonama
            hour_to_zone = {}
            
            for zone_name, zone_data in tariff_data['zones'].items():
                for period in zone_data['periods']:
                    days = period.get('days', [])
                    hours = period.get('hours', [])
                    
                    if hours == 'all':
                        hours = list(range(24))
                    
                    for day in days:
                        for hour in hours:
                            key = (day, hour)
                            hour_to_zone[key] = {
                                'period': zone_name,
                                'price': zone_data['price_eur_kwh']
                            }
            
            # Generiraj tariff za sve slotove
            tariffs = []
            
            for slot in range(96):
                hour = slot // 4
                
                # Za default dan (weekday - utorak)
                day = 'tuesday'
                
                zone_info = hour_to_zone.get((day, hour))
                
                if zone_info:
                    period = zone_info['period']
                    price = zone_info['price']
                else:
                    # Fallback
                    period = 'mid_peak'
                    price = 0.125
                
                tariffs.append((slot, hour, period, price))
            
            return tariffs
            
        except Exception as e:
            print(f"ERROR pri ucitavanju hrvatske tarife: {e}")
            return self._create_default_tariff()
    
    def _create_tariff_from_dict(self, tariff_data):
        """Kreiraj tariff iz dict formata"""
        
        # Konverzija kuna u eure
        kn_to_eur = 1 / 7.53450
        
        # Provjeri jesu li cijene u kunama
        sample_price = tariff_data.get('off_peak', 0.066)
        convert = sample_price > 0.3
        
        tariffs = []
        
        for slot in range(96):
            hour = slot // 4
            
            if hour < 9 or hour >= 23:
                period = 'off-peak'
                price = tariff_data.get('off_peak', 0.498)
            elif 10 <= hour < 12 or 13 <= hour < 17:
                period = 'on-peak'
                price = tariff_data.get('on_peak', 1.604)
            else:
                period = 'mid-peak'
                price = tariff_data.get('mid_peak', 0.942)
            
            if convert:
                price = price * kn_to_eur
            
            tariffs.append((slot, hour, period, round(price, 4)))
        
        return tariffs
    
    def _create_tariff_from_list(self, tariff_data):
        """Kreiraj tariff iz list formata"""
        tariffs = []
        
        for item in tariff_data:
            slot = item.get('slot', item.get('hour', 0) * 4)
            hour = item.get('hour', 0)
            period = item.get('period', 'mid-peak')
            price = item.get('price', 0.125)
            
            tariffs.append((slot, hour, period, round(price, 4)))
        
        return tariffs
    
    def _create_default_tariff(self):
        """Default HEP tariff u eurima"""
        tariffs = []
        
        for slot in range(96):
            hour = slot // 4
            
            if hour < 9 or hour >= 23:
                period, price = 'off-peak', 0.066
            elif 10 <= hour < 12 or 13 <= hour < 17:
                period, price = 'on-peak', 0.213
            else:
                period, price = 'mid-peak', 0.125
            
            tariffs.append((slot, hour, period, price))
        
        return tariffs
    
    def generate_building_profile_by_type(self, building_type='office', config_file='building_profiles.json'):
        """
        Generiraj profil potrosnje prema tipu zgrade
        
        building_type: 'office', 'school', 'hospital', 'residential', 'shopping_center'
        """
        
        config_path = Path(config_file)
        
        if not config_path.exists():
            print(f"WARNING: {config_file} ne postoji, koristim default office profil")
            return self._generate_default_building_profile()
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            if building_type not in config['building_types']:
                print(f"WARNING: Nepoznat tip zgrade '{building_type}', koristim 'office'")
                building_type = 'office'
            
            building_config = config['building_types'][building_type]
            
            print(f"Generiranje profila za: {building_config['name']}")
            
            # Generiranje godisnjeg profila
            start_date = datetime(2024, 1, 1)
            time_index = pd.date_range(
                start=start_date,
                periods=35040,  # 365 dana * 96
                freq='15min'
            )
            
            profile = self._generate_profile_from_config(time_index, building_config)
            
            # Skaliranje na zeljenu godisnju potrosnju
            annual_kwh = building_config['annual_consumption_kwh']
            current_annual = profile.sum() * 0.25  # 15min = 0.25h
            scaling_factor = annual_kwh / current_annual
            profile_scaled = profile * scaling_factor
            
            building_df = pd.DataFrame({
                'timestamp': time_index,
                'power_kw': profile_scaled,
                'hour': time_index.hour,
                'day_of_week': time_index.dayofweek,
                'month': time_index.month
            })
            
            # Spremi u bazu
            building_df.to_sql('building_load', self.conn, if_exists='replace', index=False)
            
            stats = {
                'building_type': building_type,
                'annual_consumption_kwh': float(building_df['power_kw'].sum() * 0.25),
                'average_power_kw': float(building_df['power_kw'].mean()),
                'peak_power_kw': float(building_df['power_kw'].max())
            }
            
            print(f"Godisnja potrosnja: {stats['annual_consumption_kwh']:,.2f} kWh")
            print(f"Vrsna snaga: {stats['peak_power_kw']:.2f} kW")
            
            # Spremi CSV
            output_dir = Path(self.output_dir)
            output_dir.mkdir(exist_ok=True)
            
            building_df.to_csv(f'{self.output_dir}/building_profile_{building_type}.csv', index=False)
            
            with open(f'{self.output_dir}/building_stats_{building_type}.json', 'w') as f:
                json.dump(stats, f, indent=2)
            
            return building_df
            
        except Exception as e:
            print(f"ERROR pri generiranju profila: {e}")
            import traceback
            traceback.print_exc()
            return self._generate_default_building_profile()
    
    def _generate_profile_from_config(self, time_index, building_config):
        """Generiraj profil iz konfiguracije"""
        
        profile = np.zeros(len(time_index))
        char = building_config['profile_characteristics']
        seasonal = building_config['seasonal_factors']
        
        for idx, ts in enumerate(time_index):
            hour = ts.hour
            day_of_week = ts.dayofweek  # 0=Monday, 6=Sunday
            month = ts.month
            
            # Sezonski faktor
            if month in [12, 1, 2]:
                season_factor = seasonal['winter']
            elif month in [6, 7, 8]:
                season_factor = seasonal['summer']
            else:
                season_factor = seasonal['spring_autumn']
            
            # Osnovni load
            if day_of_week < 5:  # Radni dan
                load = self._get_load_for_hour(hour, char, 'weekday')
            else:  # Weekend
                if 'weekend_load_factor' in char:
                    load = char['weekend_load_factor']
                else:
                    load = 0.10
            
            # Primijeni sezonski faktor i noise
            noise = np.random.normal(1.0, 0.05)
            profile[idx] = load * season_factor * max(0.9, min(1.1, noise))
        
        return profile
    
    def _get_load_for_hour(self, hour, char, day_type='weekday'):
        """Dohvati load factor za dani sat"""
        
        # Check morning ramp
        if 'weekday_morning_ramp' in char:
            ramp = char['weekday_morning_ramp']
            if hour in ramp['hours']:
                idx_hour = ramp['hours'].index(hour)
                return ramp['load_factor'][idx_hour] if isinstance(ramp['load_factor'], list) else ramp['load_factor']
        
        if 'morning_ramp' in char:
            ramp = char['morning_ramp']
            if hour in ramp['hours']:
                idx_hour = ramp['hours'].index(hour)
                return ramp['load_factor'][idx_hour] if isinstance(ramp['load_factor'], list) else ramp['load_factor']
        
        # Check peak
        if 'weekday_peak' in char and hour in char['weekday_peak']['hours']:
            return char['weekday_peak']['load_factor']
        
        # Check evening ramp
        if 'weekday_evening_ramp' in char:
            ramp = char['weekday_evening_ramp']
            if hour in ramp['hours']:
                idx_hour = ramp['hours'].index(hour)
                return ramp['load_factor'][idx_hour] if isinstance(ramp['load_factor'], list) else ramp['load_factor']
        
        # Check morning peak
        if 'morning_peak' in char and hour in char['morning_peak']['hours']:
            hours = char['morning_peak']['hours']
            if hour in hours:
                if isinstance(char['morning_peak']['load_factor'], list):
                    idx_hour = hours.index(hour)
                    return char['morning_peak']['load_factor'][idx_hour]
                else:
                    return char['morning_peak']['load_factor']
        
        # Check evening peak
        if 'evening_peak' in char and hour in char['evening_peak']['hours']:
            hours = char['evening_peak']['hours']
            if hour in hours:
                if isinstance(char['evening_peak']['load_factor'], list):
                    idx_hour = hours.index(hour)
                    return char['evening_peak']['load_factor'][idx_hour]
                else:
                    return char['evening_peak']['load_factor']
        
        # Check day midload
        if 'day_midload' in char and hour in char['day_midload']['hours']:
            return char['day_midload']['load_factor']
        
        # Check afternoon peak
        if 'afternoon_peak' in char and hour in char['afternoon_peak']['hours']:
            return char['afternoon_peak']['load_factor']
        
        # Check night minimum
        if 'night_minimum' in char and hour in char['night_minimum']['hours']:
            return char['night_minimum']['load_factor']
        
        # Check base load 24h (for hospitals)
        if 'base_load_24h' in char:
            return char['base_load_24h']
        
        # Check night base load
        if 'night_base_load' in char:
            return char['night_base_load']
        
        # Default
        return char.get('weekday_base_load', 0.25)
    
    def _generate_default_building_profile(self):
        """Generiraj default profil zgrade (fallback)"""
        
        start_date = datetime(2024, 1, 1)
        time_index = pd.date_range(
            start=start_date,
            periods=35040,
            freq='15min'
        )
        
        profile = np.zeros(len(time_index))
        
        for idx, ts in enumerate(time_index):
            hour = ts.hour
            if 0 <= hour < 7:
                profile[idx] = 90 + np.random.uniform(-5, 5)
            elif 7 <= hour < 9:
                profile[idx] = 100 + (hour - 7) * 25
            elif 9 <= hour < 17:
                profile[idx] = 140 + np.random.uniform(-10, 20)
            elif 17 <= hour < 20:
                profile[idx] = 130 - (hour - 17) * 15
            else:
                profile[idx] = 100
        
        building_df = pd.DataFrame({
            'timestamp': time_index,
            'power_kw': profile,
            'hour': time_index.hour,
            'day_of_week': time_index.dayofweek,
            'month': time_index.month
        })
        
        building_df.to_sql('building_load', self.conn, if_exists='replace', index=False)
        
        return building_df
    
    def close(self):
        self.conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("V2B Database Initialization - ENHANCED")
    print("=" * 60)
    
    db = V2BDatabase('v2b_system.db')
    
    print("\nLoading CSV data...")
    db.load_csv_data()
    
    print("\nLoading Croatian tariff...")
    db.load_tariff(use_croatian=True)
    
    print("\nGenerating building profile (office)...")
    db.generate_building_profile_by_type('office')
    
    print("\nDatabase initialization complete!")
    print("=" * 60)
    
    db.close()