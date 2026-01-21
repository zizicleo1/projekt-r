"""
═══════════════════════════════════════════════════════════════════════════
DIGITAL TWIN V2B - DATA EXTRACTION SCRIPT (FINAL FIX)
═══════════════════════════════════════════════════════════════════════════
"""

import pandas as pd
import numpy as np
import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict
import warnings
warnings.filterwarnings('ignore')

CONFIG = {
    'location': {
        'city': 'Zagreb',
        'latitude': 45.8150,
        'longitude': 15.9819
    },
    'building': {
        'type': 'office',
        'annual_consumption_kwh': 500000
    },
    'pv': {
        'peak_power_kwp': 100,
        'slope': 35,
        'azimuth': 0,
        'loss': 14,
        'year': 2020
    },
    'ev_fleet': {
        'num_vehicles': 50,
        'arrival_mean_hour': 8.5,
        'arrival_std_hour': 1.0,
        'departure_mean_hour': 17.5,
        'departure_std_hour': 2.0,
        'daily_distance_mean_km': 50,
        'daily_distance_std_km': 15
    },
    'output_dir': 'extracted_data'
}


class DataExtractor:
    
    def __init__(self, config: Dict):
        self.config = config
        self.output_dir = config['output_dir']
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.building_profile = None
        self.pv_profile = None
        self.hep_tariff = None
        self.ev_catalog = None
        self.charger_catalog = None
        self.ev_behavior_profiles = None
        
        print("="*70)
        print("DIGITAL TWIN V2B - DATA EXTRACTION")
        print("="*70)
        print(f"Output: {self.output_dir}\n")
    
    # ═══════════════════════════════════════════════════════════════════════
    # 1. BUILDING PROFILE
    # ═══════════════════════════════════════════════════════════════════════
    
    def extract_building_profile(self):
        print("1. PROFIL POTROŠNJE ZGRADE")
        print("-" * 70)
        
        annual_kwh = self.config['building']['annual_consumption_kwh']
        
        start_date = datetime(2024, 1, 1)
        time_index = pd.date_range(
            start=start_date,
            periods=35040,  
            freq='15min'
        )
        
        profile = self._generate_building_profile(time_index)
        current_annual = profile.sum() * 0.25
        scaling_factor = annual_kwh / current_annual
        profile_scaled = profile * scaling_factor
        
        self.building_profile = pd.DataFrame({
            'timestamp': time_index,
            'power_kw': profile_scaled,
            'hour': time_index.hour,
            'day_of_week': time_index.dayofweek,
            'month': time_index.month
        })
        
        stats = {
            'annual_consumption_kwh': float(self.building_profile['power_kw'].sum() * 0.25),
            'average_power_kw': float(self.building_profile['power_kw'].mean()),
            'peak_power_kw': float(self.building_profile['power_kw'].max())
        }
        
        print(f"Godišnja potrošnja: {stats['annual_consumption_kwh']:,.2f} kWh")
        print(f"Vršna snaga: {stats['peak_power_kw']:.2f} kW")
        
        self.building_profile.to_csv(f'{self.output_dir}/building_profile.csv', index=False)
        with open(f'{self.output_dir}/building_stats.json', 'w') as f:
            json.dump(stats, f, indent=2)
        
        print(f"✓ Spremljeno\n")
        return self.building_profile
    
    def _generate_building_profile(self, time_index):
        profile = np.zeros(len(time_index))
        
        for idx, ts in enumerate(time_index):
            hour = ts.hour
            day_of_week = ts.dayofweek
            month = ts.month
            
            if day_of_week < 5:
                if 7 <= hour < 19:
                    if hour < 9:
                        load = 0.7
                    elif 9 <= hour < 12:
                        load = 0.95
                    elif 12 <= hour < 14:
                        load = 0.85
                    else:
                        load = 0.90
                else:
                    load = 0.25
            else:
                load = 0.10
            
            if month in [12, 1, 2]:
                seasonal = 1.35
            elif month in [6, 7, 8]:
                seasonal = 1.25
            else:
                seasonal = 1.0
            
            noise = np.random.normal(1.0, 0.05)
            profile[idx] = load * seasonal * max(0.9, min(1.1, noise))
        
        return profile
    
    # ═══════════════════════════════════════════════════════════════════════
    # 2. PV PROFILE - FIXED VERSION
    # ═══════════════════════════════════════════════════════════════════════
    
    def extract_pv_profile(self):
        print("2. PV PROIZVODNJA (PVGIS API)")
        print("-" * 70)
        
        lat = self.config['location']['latitude']
        lon = self.config['location']['longitude']
        pv_config = self.config['pv']
        
        print(f"Lokacija: {self.config['location']['city']}")
        print(f"PV kapacitet: {pv_config['peak_power_kwp']} kWp")
        
        url = "https://re.jrc.ec.europa.eu/api/v5_2/seriescalc"
        
        params = {
            'lat': lat,
            'lon': lon,
            'peakpower': pv_config['peak_power_kwp'],
            'loss': pv_config['loss'],
            'angle': pv_config['slope'],
            'aspect': pv_config['azimuth'],
            'outputformat': 'json',
            'startyear': pv_config['year'],
            'endyear': pv_config['year'],
            'pvcalculation': 1,
            'pvtechchoice': 'crystSi',
            'mountingplace': 'building'
        }
        
        print("Slanje zahtjeva prema PVGIS...")
        
        try:
            response = requests.get(url, params=params, timeout=180)
            
            if response.status_code != 200:
                print(f"✗ HTTP Error {response.status_code}")
                print("Koristim dummy podatke...")
                return self._generate_dummy_pv()
            
            data = response.json()
            
            if 'outputs' not in data or 'hourly' not in data['outputs']:
                print("✗ Nema hourly podataka")
                print("Koristim dummy podatke...")
                return self._generate_dummy_pv()
            
            hourly_data = data['outputs']['hourly']
            print(f"✓ Primljeno {len(hourly_data)} satnih podataka")
            
            # KRITIČNO: Pažljivo parsiranje
            pv_records = []
            errors = 0
            
            for entry in hourly_data:
                try:
                    timestamp_str = entry['time']
                    timestamp = datetime.strptime(timestamp_str, "%Y%m%d:%H%M")
                    
                    # Provjeri da 'P' postoji
                    if 'P' not in entry:
                        errors += 1
                        continue
                    
                    pv_power_w = float(entry['P'])
                    
                    pv_records.append({
                        'timestamp': timestamp,
                        'pv_power_kw': pv_power_w / 1000.0,  # W → kW
                        'solar_irradiance_w_m2': float(entry.get('G(i)', 0)),
                        'temp_air_c': float(entry.get('T2m', 0))
                    })
                    
                except Exception as e:
                    errors += 1
                    continue
            
            if errors > 0:
                print(f"⚠️  {errors} redaka preskočeno zbog greške")
            
            if len(pv_records) == 0:
                print("✗ Parsiranje nije uspjelo")
                print("Koristim dummy podatke...")
                return self._generate_dummy_pv()
            
            # Kreiraj DataFrame
            df_hourly = pd.DataFrame(pv_records)
            df_hourly = df_hourly.sort_values('timestamp').reset_index(drop=True)
            
            print(f"✓ Uspješno parsirano {len(df_hourly)} redaka")
            print(f"   Sample podataka:")
            print(df_hourly.head(3))
            
            # Interpolacija na 15min - PAŽLJIVO
            print("\nInterpolacija na 15min...")
            df_hourly_indexed = df_hourly.set_index('timestamp')
            
            # Generiraj 15min index za cijelu godinu 2020
            time_15min = pd.date_range(
                start='2020-01-01 00:00:00',
                end='2020-12-31 23:45:00',
                freq='15min'
            )
            
            # Reindex i interpoliraj
            df_15min = df_hourly_indexed.reindex(
                df_hourly_indexed.index.union(time_15min)
            ).interpolate(method='linear').reindex(time_15min)
            
            df_15min = df_15min.reset_index()
            df_15min.columns = ['timestamp', 'pv_power_kw', 'solar_irradiance_w_m2', 'temp_air_c']
            
            # Provjera
            null_count = df_15min['pv_power_kw'].isnull().sum()
            if null_count > 0:
                print(f"⚠️  {null_count} null vrijednosti - popunjavam s 0")
                df_15min['pv_power_kw'].fillna(0, inplace=True)
                df_15min['solar_irradiance_w_m2'].fillna(0, inplace=True)
                df_15min['temp_air_c'].fillna(0, inplace=True)
            
            self.pv_profile = df_15min
            
            # Statistike
            annual_production = self.pv_profile['pv_power_kw'].sum() * 0.25
            
            stats = {
                'annual_production_kwh': float(annual_production),
                'average_power_kw': float(self.pv_profile['pv_power_kw'].mean()),
                'peak_power_kw': float(self.pv_profile['pv_power_kw'].max())
            }
            
            print(f"\n✓ Interpolirano: {len(self.pv_profile)} redaka")
            print(f"Godišnja proizvodnja: {stats['annual_production_kwh']:,.2f} kWh")
            print(f"Vršna snaga: {stats['peak_power_kw']:.2f} kW")
            
            # Provjeri sample
            print(f"\nSample interpoliranih podataka:")
            print(self.pv_profile.iloc[400:405])  # Oko 10:00
            
            # Spremi
            self.pv_profile.to_csv(f'{self.output_dir}/pv_profile.csv', index=False)
            with open(f'{self.output_dir}/pv_stats.json', 'w') as f:
                json.dump(stats, f, indent=2)
            
            print(f"\n✓ Spremljeno\n")
            return self.pv_profile
            
        except Exception as e:
            print(f"✗ GREŠKA: {e}")
            print("Koristim dummy podatke...")
            return self._generate_dummy_pv()
    
    def _generate_dummy_pv(self):
        """Fallback - dummy PV podaci"""
        print("\n--- GENERIRANJE DUMMY PV PODATAKA ---")
        
        peak_power = self.config['pv']['peak_power_kwp']
        
        time_index = pd.date_range(
            start='2020-01-01 00:00:00',
            end='2020-12-31 23:45:00',
            freq='15min'
        )
        
        pv_power = []
        for ts in time_index:
            hour = ts.hour
            month = ts.month
            day_of_year = ts.dayofyear
            
            if hour < 6 or hour >= 20:
                power = 0
            else:
                hours_from_sunrise = hour - 6
                daily_factor = np.sin(np.pi * hours_from_sunrise / 14)
                seasonal_factor = 0.4 + 0.6 * np.sin(2 * np.pi * (day_of_year - 80) / 365)
                cloud_factor = max(0, min(1.2, np.random.normal(1.0, 0.15)))
                power = peak_power * daily_factor * seasonal_factor * cloud_factor
            
            pv_power.append(max(0, power))
        
        self.pv_profile = pd.DataFrame({
            'timestamp': time_index,
            'pv_power_kw': pv_power,
            'solar_irradiance_w_m2': 0,
            'temp_air_c': 0
        })
        
        annual_production = self.pv_profile['pv_power_kw'].sum() * 0.25
        print(f"Godišnja proizvodnja: {annual_production:,.2f} kWh")
        
        self.pv_profile.to_csv(f'{self.output_dir}/pv_profile.csv', index=False)
        
        stats = {
            'annual_production_kwh': float(annual_production),
            'average_power_kw': float(self.pv_profile['pv_power_kw'].mean()),
            'peak_power_kw': float(self.pv_profile['pv_power_kw'].max()),
            'note': 'DUMMY DATA - PVGIS nije bio dostupan'
        }
        
        with open(f'{self.output_dir}/pv_stats.json', 'w') as f:
            json.dump(stats, f, indent=2)
        
        print("✓ Dummy PV profil spremljen\n")
        return self.pv_profile
    
    # ═══════════════════════════════════════════════════════════════════════
    # 3. HEP TARIFE
    # ═══════════════════════════════════════════════════════════════════════
    
    def extract_hep_tariff(self):
        print("3. HEP TARIFNA STRUKTURA")
        print("-" * 70)
        
        self.hep_tariff = {
            'name': 'Bijela tarifa (dvotarifna)',
            'type': 'dual',
            'zones': {
                'visa_tarifa': {
                    'name': 'Viša tarifa (VT)',
                    'price_eur_per_kwh': 0.122,
                    'hours': list(range(7, 22)),
                    'description': 'Dnevna 07:00-22:00'
                },
                'niza_tarifa': {
                    'name': 'Niža tarifa (NT)',
                    'price_eur_per_kwh': 0.062,
                    'hours': list(range(0, 7)) + list(range(22, 24)),
                    'description': 'Noćna 22:00-07:00'
                }
            }
        }
        
        print("VT: 0.122 EUR/kWh (07:00-22:00)")
        print("NT: 0.062 EUR/kWh (22:00-07:00)")
        
        with open(f'{self.output_dir}/hep_tariff.json', 'w', encoding='utf-8') as f:
            json.dump(self.hep_tariff, f, indent=2, ensure_ascii=False)
        
        print("✓ Spremljeno\n")
        return self.hep_tariff
    
    # ═══════════════════════════════════════════════════════════════════════
    # 4. EV KATALOG - 4 MODELA
    # ═══════════════════════════════════════════════════════════════════════
    
    def extract_ev_catalog(self):
        print("4. KATALOG ELEKTRIČNIH VOZILA")
        print("-" * 70)
        
        ev_data = [
            {
                'manufacturer': 'Tesla',
                'model': 'Model 3 SR',
                'battery_capacity_kwh': 55.0,
                'usable_capacity_kwh': 52.5,
                'max_charging_power_kw': 11.0,
                'consumption_kwh_per_100km': 14.0,
                'max_range_km': 430,
                'price_eur': 42990
            },
            {
                'manufacturer': 'Kia',
                'model': 'EV6 LR',
                'battery_capacity_kwh': 77.4,
                'usable_capacity_kwh': 74.0,
                'max_charging_power_kw': 11.0,
                'consumption_kwh_per_100km': 16.8,
                'max_range_km': 528,
                'price_eur': 51900
            },
            {
                'manufacturer': 'Opel',
                'model': 'Corsa-e',
                'battery_capacity_kwh': 50.0,
                'usable_capacity_kwh': 46.3,
                'max_charging_power_kw': 11.0,
                'consumption_kwh_per_100km': 15.3,
                'max_range_km': 357,
                'price_eur': 33900
            },
            {
                'manufacturer': 'Renault',
                'model': 'Megane E-Tech',
                'battery_capacity_kwh': 60.0,
                'usable_capacity_kwh': 57.0,
                'max_charging_power_kw': 22.0,
                'consumption_kwh_per_100km': 15.5,
                'max_range_km': 450,
                'price_eur': 39500
            }
        ]
        
        self.ev_catalog = pd.DataFrame(ev_data)
        
        print(f"Broj modela: {len(self.ev_catalog)}")
        print(self.ev_catalog[['manufacturer', 'model', 'battery_capacity_kwh']].to_string(index=False))
        
        self.ev_catalog.to_csv(f'{self.output_dir}/ev_catalog.csv', index=False)
        print("\n✓ Spremljeno\n")
        return self.ev_catalog
    
    # ═══════════════════════════════════════════════════════════════════════
    # 5. EV PROFILI
    # ═══════════════════════════════════════════════════════════════════════
    
    def extract_ev_behavior_profiles(self):
        print("5. PROFILI PONAŠANJA EV VOZILA")
        print("-" * 70)
        
        fleet_config = self.config['ev_fleet']
        num_vehicles = fleet_config['num_vehicles']
        
        np.random.seed(42)
        profiles = []
        
        for i in range(num_vehicles):
            arrival_hour = np.clip(
                np.random.normal(fleet_config['arrival_mean_hour'], fleet_config['arrival_std_hour']),
                6, 10
            )
            departure_hour = np.clip(
                np.random.normal(fleet_config['departure_mean_hour'], fleet_config['departure_std_hour']),
                15, 20
            )
            daily_distance_km = np.clip(
                np.random.normal(fleet_config['daily_distance_mean_km'], fleet_config['daily_distance_std_km']),
                5, 150
            )
            initial_soc = np.random.uniform(0.2, 0.8)
            
            ev_model = self.ev_catalog.iloc[np.random.randint(0, len(self.ev_catalog))]
            
            energy_needed_kwh = (daily_distance_km / 100) * ev_model['consumption_kwh_per_100km']
            required_soc_increase = energy_needed_kwh / ev_model['usable_capacity_kwh']
            target_soc = min(initial_soc + required_soc_increase + 0.1, 0.9)
            
            profiles.append({
                'vehicle_id': f'EV_{i+1:03d}',
                'manufacturer': ev_model['manufacturer'],
                'model': ev_model['model'],
                'battery_capacity_kwh': ev_model['battery_capacity_kwh'],
                'usable_capacity_kwh': ev_model['usable_capacity_kwh'],
                'max_charging_power_kw': ev_model['max_charging_power_kw'],
                'consumption_kwh_per_100km': ev_model['consumption_kwh_per_100km'],
                'arrival_hour': round(arrival_hour, 2),
                'departure_hour': round(departure_hour, 2),
                'initial_soc': round(initial_soc, 3),
                'daily_distance_km': round(daily_distance_km, 1),
                'energy_needed_kwh': round(energy_needed_kwh, 2),
                'target_soc': round(target_soc, 3)
            })
        
        self.ev_behavior_profiles = pd.DataFrame(profiles)
        
        print(f"Generirano: {len(self.ev_behavior_profiles)} profila")
        
        self.ev_behavior_profiles.to_csv(f'{self.output_dir}/ev_behavior_profiles.csv', index=False)
        print("✓ Spremljeno\n")
        return self.ev_behavior_profiles
    
    # ═══════════════════════════════════════════════════════════════════════
    # 6. PUNJAČI - 2 AC + 1 DC
    # ═══════════════════════════════════════════════════════════════════════
    
    def extract_charger_catalog(self):
        print("6. KATALOG PUNJAČA")
        print("-" * 70)
        
        chargers = [
            {
                'type': 'AC_11kW',
                'name': 'AC Punjač 11 kW',
                'standard': 'IEC 62196 Type 2',
                'power_kw': 11.0,
                'efficiency': 0.94,
                'installation_cost_eur': 1500,
                'suitable_for': 'Standardno punjenje'
            },
            {
                'type': 'AC_22kW',
                'name': 'AC Punjač 22 kW',
                'standard': 'IEC 62196 Type 2',
                'power_kw': 22.0,
                'efficiency': 0.93,
                'installation_cost_eur': 2500,
                'suitable_for': 'Brže AC punjenje'
            },
            {
                'type': 'DC_50kW',
                'name': 'DC Brzi punjač 50 kW',
                'standard': 'CCS Combo 2',
                'power_kw': 50.0,
                'efficiency': 0.92,
                'installation_cost_eur': 25000,
                'suitable_for': 'Brzo punjenje'
            }
        ]
        
        self.charger_catalog = pd.DataFrame(chargers)
        
        print(self.charger_catalog[['name', 'power_kw', 'efficiency']].to_string(index=False))
        
        self.charger_catalog.to_csv(f'{self.output_dir}/charger_catalog.csv', index=False)
        print("\n✓ Spremljeno\n")
        return self.charger_catalog
    
    # ═══════════════════════════════════════════════════════════════════════
    # GLAVNI WORKFLOW
    # ═══════════════════════════════════════════════════════════════════════
    
    def extract_all(self):
        print("\n")
        print("┏" + "━"*68 + "┓")
        print("┃" + " POKRETANJE EKSTRAKCIJE ".center(68) + "┃")
        print("┗" + "━"*68 + "┛")
        print("\n")
        
        self.extract_building_profile()
        self.extract_pv_profile()
        self.extract_hep_tariff()
        self.extract_ev_catalog()
        self.extract_ev_behavior_profiles()
        self.extract_charger_catalog()
        
        print("\n" + "="*70)
        print("✓ EKSTRAKCIJA ZAVRŠENA!")
        print("="*70)


if __name__ == "__main__":
    
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " DIGITAL TWIN V2B - DATA EXTRACTION (FINAL) ".center(68) + "║")
    print("╚" + "═"*68 + "╝")
    print("\n")
    
    extractor = DataExtractor(CONFIG)
    extractor.extract_all()