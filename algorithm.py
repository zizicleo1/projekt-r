# algorithm.py - MATRIX-BASED MODEL (prema PDF dokumentu)
"""
V2B Energy Management Algorithm - Matrix Implementation
Bazirano na matematičkom modelu iz PDF dokumenta:
- Availability matrica A[N,T]
- Power matrica P_EV[N,T]
- SOC matrica SoC_EV[N,T+1]
- Energetska bilanca sustava
"""

import numpy as np
import pandas as pd
import sqlite3
from typing import Dict, Tuple

class V2BController:
    """
    Kontroler za V2B sustav - Matricni pristup
    
    Matrice:
    - A[i,t]: Availability (prisutnost vozila)
    - P_EV[i,t]: Snaga punjenja/pražnjenja [kW]
    - SoC_EV[i,t]: State of Charge [0-1]
    - B_EV[i]: Kapacitet baterije [kWh]
    """
    
    def __init__(self, db_path: str = 'v2b_system.db'):
        self.conn = sqlite3.connect(db_path)
        self.dt = 0.25  # Vremenska diskretizacija: 15 min = 0.25h
        self.T = 96     # Broj vremenskih koraka (24h * 4)
        
        # Učinkovitosti
        self.eta_ch = 0.90   # Punjenje
        self.eta_dis = 0.85  # Pražnjenje
        
        # SOC ograničenja (iz PDF-a)
        self.SoC_min = 0.10
        self.SoC_max = 0.90
        self.SoC_req = 0.90  # Ciljni SOC pri odlasku
        
        # Učitaj profile
        self.P_building = self._load_building_profile()  # [T]
        self.P_PV = self._load_pv_profile()              # [T]
        self.pv_profile = self.P_PV  # Backward compatibility za main.py
        self.tariff = self._load_tariff()                # Dict
        self.ev_catalog = self._load_ev_catalog()        # Dict
        
        print("V2BController initialized (Matrix-based)")
        print(f"  Time steps: {self.T} (Δt = {self.dt}h)")
        print(f"  Building profile: {len(self.P_building)} slots")
        print(f"  PV profile: {len(self.P_PV)} slots")
        print(f"  EV catalog: {len(self.ev_catalog)} models")
    
    def _load_building_profile(self) -> np.ndarray:
        """Učitaj profil potrošnje zgrade P_building[t]"""
        query = "SELECT power_kw FROM building_load ORDER BY timestamp LIMIT 96"
        df = pd.read_sql(query, self.conn)
        if len(df) == 0:
            return self._generate_default_building_profile()
        return df['power_kw'].values
    
    def _load_pv_profile(self) -> np.ndarray:
        """Učitaj profil PV proizvodnje P_PV[t]"""
        query = "SELECT pv_power_kw FROM pv_generation ORDER BY timestamp LIMIT 96"
        df = pd.read_sql(query, self.conn)
        if len(df) == 0:
            return self._generate_default_pv_profile()
        return df['pv_power_kw'].values
    
    def _load_tariff(self) -> Dict:
        """Učitaj tarifni model c[t]"""
        query = "SELECT time_slot, period, price_kwh FROM tariff ORDER BY time_slot"
        df = pd.read_sql(query, self.conn)
        tariff = {}
        for _, row in df.iterrows():
            tariff[row['time_slot']] = {
                'period': row['period'],
                'price_kwh': row['price_kwh']
            }
        return tariff
    
    def _load_ev_catalog(self) -> Dict:
        """Učitaj katalog vozila"""
        query = """
            SELECT model, battery_capacity_kwh, max_range_km, max_charging_power_kw 
            FROM ev_catalog
        """
        df = pd.read_sql(query, self.conn)
        catalog = {}
        for idx, row in df.iterrows():
            catalog[idx + 1] = {
                'model': row['model'],
                'battery_kwh': row['battery_capacity_kwh'],
                'max_range_km': row['max_range_km'],
                'charging_power_kw': row['max_charging_power_kw']
            }
        return catalog
    
    def _generate_default_building_profile(self) -> np.ndarray:
        """Generiraj default profil zgrade"""
        profile = np.zeros(96)
        for t in range(96):
            hour = t // 4
            if 0 <= hour < 7:
                profile[t] = 90 + np.random.uniform(-5, 5)
            elif 7 <= hour < 9:
                profile[t] = 100 + (hour - 7) * 25
            elif 9 <= hour < 17:
                profile[t] = 140 + np.random.uniform(-10, 20)
            elif 17 <= hour < 20:
                profile[t] = 130 - (hour - 17) * 15
            else:
                profile[t] = 100
        return profile
    
    def _generate_default_pv_profile(self) -> np.ndarray:
        """Generiraj default PV profil"""
        profile = np.zeros(96)
        for t in range(96):
            hour = t / 4
            if 6 <= hour <= 20:
                profile[t] = 30 * np.exp(-((hour - 13)**2) / (2 * 3**2))
        return profile

    def _load_profiles_for_date(self, date_str: str):
        """
        Učitaj profile za specifičan datum

        Args:
            date_str: Datum u formatu YYYY-MM-DD (npr. 2025-06-21)
        """
        # Izračunaj dan u godini (1-366) - koristimo samo mjesec i dan
        # jer su podaci u bazi za 2020, ali korisnik može izabrati bilo koju godinu
        from datetime import datetime
        date = datetime.strptime(date_str, '%Y-%m-%d')
        # Mapiraj na 2020 (prijestupna godina) da dobijemo pravilan dan
        date_2020 = date.replace(year=2020)
        day_of_year = date_2020.timetuple().tm_yday

        # Izračunaj offset - svaki dan ima 96 slotova (24h * 4)
        start_slot = (day_of_year - 1) * 96
        end_slot = start_slot + 96

        print(f"Loading profiles for date {date_str} (day {day_of_year})")
        print(f"  Slot range: {start_slot} - {end_slot}")

        # Učitaj building profile za taj dan
        query_building = f"""
            SELECT power_kw FROM building_load
            ORDER BY timestamp
            LIMIT 96 OFFSET {start_slot}
        """
        df_building = pd.read_sql(query_building, self.conn)
        if len(df_building) == 96:
            self.P_building = df_building['power_kw'].values
            print(f"  Building profile loaded: {len(self.P_building)} slots")
        else:
            print(f"  WARNING: Building profile has {len(df_building)} slots, using default")
            self.P_building = self._generate_default_building_profile()

        # Učitaj PV profile za taj dan
        query_pv = f"""
            SELECT pv_power_kw FROM pv_generation
            ORDER BY timestamp
            LIMIT 96 OFFSET {start_slot}
        """
        df_pv = pd.read_sql(query_pv, self.conn)
        if len(df_pv) == 96:
            self.P_PV = df_pv['pv_power_kw'].values
            self.pv_profile = self.P_PV
            print(f"  PV profile loaded: {len(self.P_PV)} slots")
        else:
            print(f"  WARNING: PV profile has {len(df_pv)} slots, using default")
            self.P_PV = self._generate_default_pv_profile()
            self.pv_profile = self.P_PV

    def generate_ev_fleet(self, N: int, ev_fleet_config: list = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Generiraj EV flotu

        Args:
            N: Ukupan broj vozila
            ev_fleet_config: Lista dict-ova s model_id i count za svaki model
                             Npr: [{"model_id": 1, "count": 5}, {"model_id": 2, "count": 10}]

        Returns:
            A[i,t]: Availability matrica [N x T]
            B_EV[i]: Kapaciteti baterija [N]
            P_EV_max[i]: Maksimalne snage [N]
            SoC_init[i]: Početni SOC [N]
        """
        # Gaussove distribucije (iz PDF-a)
        t_arr = np.random.normal(loc=34, scale=4, size=N)  # μ=8:30, σ=1h
        t_arr = np.clip(t_arr, 28, 40).astype(int)

        t_dep = np.random.normal(loc=74, scale=8, size=N)  # μ=18:30, σ=2h
        t_dep = np.clip(t_dep, 64, 84).astype(int)

        trip_dist = np.random.normal(loc=50, scale=10, size=N)  # μ=50km, σ=10km
        trip_dist = np.clip(trip_dist, 20, 100)

        # Availability matrica A[i,t]
        A = np.zeros((N, self.T), dtype=int)
        for i in range(N):
            A[i, t_arr[i]:t_dep[i]] = 1

        # Kapaciteti i snage
        B_EV = np.zeros(N)
        P_EV_max = np.zeros(N)

        if ev_fleet_config:
            # Koristi specificiranu konfiguraciju flote
            ev_idx = 0
            for config in ev_fleet_config:
                model_id = config['model_id']
                count = config['count']
                if model_id in self.ev_catalog:
                    model = self.ev_catalog[model_id]
                    for _ in range(count):
                        if ev_idx < N:
                            B_EV[ev_idx] = model['battery_kwh']
                            P_EV_max[ev_idx] = model['charging_power_kw']
                            ev_idx += 1
            # Ako ima vise vozila nego u konfiguraciji, popuni random
            while ev_idx < N:
                model_id = np.random.randint(1, len(self.ev_catalog) + 1)
                model = self.ev_catalog[model_id]
                B_EV[ev_idx] = model['battery_kwh']
                P_EV_max[ev_idx] = model['charging_power_kw']
                ev_idx += 1
        else:
            # Nasumicno dodijeli modele kao prije
            for i in range(N):
                model_id = np.random.randint(1, len(self.ev_catalog) + 1)
                model = self.ev_catalog[model_id]
                B_EV[i] = model['battery_kwh']
                P_EV_max[i] = model['charging_power_kw']

        # Početni SOC - uniform[0.1, 0.8]
        SoC_init = np.random.uniform(0.10, 0.80, size=N)

        # Dodatne informacije za prioritet
        self.t_arr = t_arr
        self.t_dep = t_dep
        self.trip_dist = trip_dist

        return A, B_EV, P_EV_max, SoC_init
    
    def calculate_priority(self, i: int, t: int, SoC: float) -> int:
        """
        Izračunaj prioritet vozila i u trenutku t
        Prema Algorithm 1 iz originalnog PDF-a
        """
        priority = 0
        
        # SOC prioritet
        if SoC <= 0.20:
            priority += 3
        elif 0.20 < SoC < 0.80:
            priority += 2
        else:
            priority += 1
        
        # Stay time prioritet
        stay_hours = (self.t_dep[i] - self.t_arr[i]) * self.dt
        if stay_hours <= 3:
            priority += 3
        elif 3 < stay_hours < 6:
            priority += 2
        else:
            priority += 1
        
        # Trip distance prioritet
        if self.trip_dist[i] >= 40:
            priority += 3
        elif 10 < self.trip_dist[i] < 40:
            priority += 2
        else:
            priority += 1
        
        # Battery capacity prioritet
        if self.B_EV[i] >= 30:
            priority += 2
        else:
            priority += 1
        
        return priority
    
    def optimize_charging(self, A: np.ndarray, B_EV: np.ndarray, 
                         P_EV_max: np.ndarray, SoC_init: np.ndarray,
                         pv_scaling: float = 1.0) -> Tuple[np.ndarray, np.ndarray]:
        """
        Glavni algoritam optimizacije
        
        STRATEGIJA V2B DISCHARGE:
        
        OFF-PEAK (23:00-09:00, cijena: ~0.05 EUR/kWh):
          - Agresivno punjenje svih vozila
          - Nema pražnjenja
          - Priprema za on-peak period
        
        ON-PEAK (10:00-12:00, 13:00-17:00, cijena: ~0.21 EUR/kWh):
          - AGRESIVNO pražnjenje vozila → podržava zgradu
          - Smanjuje vršno opterećenje do 40%
          - Prioritet: najnapunjenija vozila
          - Margina: 10% iznad SoC_req
          
        MID-PEAK (09:00-10:00, 12:00-13:00, 17:00-23:00, cijena: ~0.13 EUR/kWh):
          - Balansirano punjenje
          - Selektivno pražnjenje ako net_load > 120 kW
          - Održava optimalnu razinu SOC
        
        Args:
            A[i,t]: Availability matrica
            B_EV[i]: Kapaciteti baterija
            P_EV_max[i]: Maksimalne snage
            SoC_init[i]: Početni SOC
            pv_scaling: PV skaliranje
        
        Returns:
            P_EV[i,t]: Matrica snaga (+ punjenje, - pražnjenje)
            SoC_EV[i,t]: Matrica SOC stanja
        """
        N = A.shape[0]
        
        # Inicijaliziraj matrice
        P_EV = np.zeros((N, self.T))
        SoC_EV = np.zeros((N, self.T + 1))
        SoC_EV[:, 0] = SoC_init
        
        # Koristi pv_profile (može biti već skaliran)
        P_PV_scaled = self.pv_profile * pv_scaling
        
        # Spremanje za cjelovitu flotu
        self.B_EV = B_EV
        self.P_EV_max = P_EV_max
        
        # Glavna petlja po vremenskim koracima
        for t in range(self.T):
            tariff = self.tariff[t]
            period = tariff['period']
            
            # Dohvati dostupna vozila
            available = np.where(A[:, t] == 1)[0]
            
            # Izračunaj prioritete
            priorities = np.array([
                self.calculate_priority(i, t, SoC_EV[i, t]) 
                for i in available
            ])
            
            # Izračunaj hitnost (urgency)
            urgency = np.array([
                self.t_dep[i] - t
                for i in available
            ])
            
            # Sortiraj po hitnosti i prioritetu
            order = np.lexsort((- priorities, urgency))
            sorted_evs = available[order]
            
            # IF-THEN-ELSE logika prema periodu
            if period == 'off-peak':
                # OFF-PEAK: Agresivno punjenje
                for i in sorted_evs:
                    if SoC_EV[i, t] < self.SoC_req:
                        # Potrebna energija
                        E_req = max(0, (self.SoC_req - SoC_EV[i, t]) * B_EV[i])
                        
                        # Maksimalna snaga punjenja
                        P = min(P_EV_max[i], E_req / (self.eta_ch * self.dt))
                        
                        if P > 0.1:
                            P_EV[i, t] = P
            
            elif period == 'on-peak':
                # ON-PEAK: Agresivno praznenje za podršku zgradi (SKUPO!)
                # Strategija: Smanjiti vršno opterećenje što više
                
                # 1. Prvo punjenje HITNIH vozila koja moraju otići uskoro
                for i in sorted_evs:
                    slots_to_dep = self.t_dep[i] - t
                    if slots_to_dep <= 4 and SoC_EV[i, t] < self.SoC_req:  # Odlazi za 1h
                        E_req = max(0, (self.SoC_req - SoC_EV[i, t]) * B_EV[i])
                        P = min(P_EV_max[i], E_req / (self.eta_ch * self.dt))
                        
                        if P > 0.1:
                            P_EV[i, t] = P
                
                # 2. AGRESIVNO V2B discharge - cilj 40% smanjenja vršnog opterećenja
                net_load = self.P_building[t] - P_PV_scaled[t]
                discharge_target = max(0, net_load * 0.40)  # 40% umjesto 10%!
                discharged = 0.0
                
                # Prvo prazni vozila koja imaju najviše viška energije
                discharge_candidates = []
                for i in sorted_evs:
                    if SoC_EV[i, t] > self.SoC_req + 0.10:  # 10% margina
                        excess_energy = (SoC_EV[i, t] - self.SoC_req - 0.10) * B_EV[i]
                        discharge_candidates.append((i, excess_energy))
                
                # Sortiraj po višku energije (najnapunjenija prva)
                discharge_candidates.sort(key=lambda x: -x[1])
                
                for i, excess in discharge_candidates:
                    if discharged >= discharge_target:
                        break
                    
                    available_discharge = (SoC_EV[i, t] - self.SoC_req - 0.10) * B_EV[i]
                    P = min(
                        P_EV_max[i] * 0.8,  # Max 80% snage (umjesto 50%)
                        available_discharge / (self.eta_dis * self.dt),
                        discharge_target - discharged
                    )
                    
                    if P > 0.1:
                        P_EV[i, t] = -P  # Negativno = pražnjenje
                        discharged += P
            
            else:  # mid-peak
                # MID-PEAK: Balansirano - punjenje + selektivno pražnjenje
                
                # 1. Puni vozila ispod SoC_req
                for i in sorted_evs:
                    if SoC_EV[i, t] < self.SoC_req:
                        slots_remaining = self.t_dep[i] - t
                        E_req = max(0, (self.SoC_req - SoC_EV[i, t]) * B_EV[i])
                        
                        if slots_remaining > 0:
                            P = min(
                                P_EV_max[i] * 0.8,  # 80% snage
                                E_req / (slots_remaining * self.eta_ch * self.dt)
                            )
                        else:
                            P = P_EV_max[i] * 0.8
                        
                        if P > 0.1:
                            P_EV[i, t] = P
                
                # 2. Selektivno V2B ako je net_load visok (>120 kW)
                net_load = self.P_building[t] - P_PV_scaled[t]
                if net_load > 120:  # Visoko opterećenje
                    discharge_target = max(0, (net_load - 120) * 0.5)  # Smanjiti na 120kW
                    discharged = 0.0
                    
                    for i in sorted_evs:
                        if discharged >= discharge_target:
                            break
                        
                        if SoC_EV[i, t] > self.SoC_req + 0.15:
                            available_discharge = (SoC_EV[i, t] - self.SoC_req - 0.15) * B_EV[i]
                            P = min(
                                P_EV_max[i] * 0.6,  # Max 60% snage
                                available_discharge / (self.eta_dis * self.dt),
                                discharge_target - discharged
                            )
                            
                            if P > 0.1:
                                P_EV[i, t] = -P
                                discharged += P
            
            # Ažuriraj SOC za sva vozila
            for i in range(N):
                if P_EV[i, t] > 0:  # Punjenje
                    SoC_EV[i, t+1] = SoC_EV[i, t] + (P_EV[i, t] * self.eta_ch * self.dt) / B_EV[i]
                elif P_EV[i, t] < 0:  # Pražnjenje
                    SoC_EV[i, t+1] = SoC_EV[i, t] + (P_EV[i, t] * self.dt) / (B_EV[i] * self.eta_dis)
                else:  # Bez promjene
                    SoC_EV[i, t+1] = SoC_EV[i, t]
                
                # Primijeni ograničenja
                SoC_EV[i, t+1] = np.clip(SoC_EV[i, t+1], self.SoC_min, self.SoC_max)
        
        return P_EV, SoC_EV
    
    def run_simulation(self, num_evs: int, scenario_name: str = "default",
                      pv_scaling: float = 1.0, ev_fleet_config: list = None,
                      simulation_date: str = None) -> Dict:
        """
        Pokreni simulaciju

        Args:
            num_evs: Ukupan broj vozila
            scenario_name: Naziv scenarija
            pv_scaling: PV skaliranje
            ev_fleet_config: Lista dict-ova s model_id i count za svaki model
            simulation_date: Datum simulacije u formatu YYYY-MM-DD (npr. 2020-06-21)

        Returns:
            Dictionary s results, kpis, fleet_summary
        """
        print(f"\n{'='*60}")
        print(f"Simulation: {num_evs} EVs, PV: {pv_scaling}x")
        if ev_fleet_config:
            print(f"Fleet config: {ev_fleet_config}")
        if simulation_date:
            print(f"Simulation date: {simulation_date}")
        print(f"{'='*60}\n")

        # Ako je specificiran datum, učitaj profile za taj dan
        if simulation_date:
            self._load_profiles_for_date(simulation_date)

        # Generiraj flotu
        A, B_EV, P_EV_max, SoC_init = self.generate_ev_fleet(num_evs, ev_fleet_config)
        
        # Optimiziraj punjenje
        P_EV, SoC_EV = self.optimize_charging(A, B_EV, P_EV_max, SoC_init, pv_scaling)
        
        # Koristi pv_profile (može biti već skaliran od main.py)
        P_PV_scaled = self.pv_profile if hasattr(self, 'pv_profile') else (self.P_PV * pv_scaling)
        
        # Izračunaj energetsku bilancu (Formula 11 iz PDF-a)
        # P_grid[t] = P_building[t] + Σ P_EV[i,t] - P_PV[t]
        P_grid = self.P_building + np.sum(P_EV, axis=0) - P_PV_scaled
        P_grid = np.maximum(P_grid, 0)  # Grid ne može biti negativan
        
        # Izračunaj troškove
        total_cost = 0.0
        for t in range(self.T):
            cost = P_grid[t] * self.dt * self.tariff[t]['price_kwh']
            total_cost += cost
        
        # KPI pokazatelji (Formula 14 iz PDF-a)
        peak_baseline = np.max(self.P_building - P_PV_scaled)
        peak_v2b = np.max(P_grid)
        peak_reduction = ((peak_baseline - peak_v2b) / peak_baseline * 100) if peak_baseline > 0 else 0
        
        # Uspješnost punjenja (Formula 14.3)
        final_socs = SoC_EV[:, self.T]
        evs_meeting_target = np.sum(final_socs >= self.SoC_req)
        success_rate = (evs_meeting_target / num_evs) * 100
        
        # Ukupna energija
        total_charged = np.sum(P_EV[P_EV > 0]) * self.dt
        total_discharged = -np.sum(P_EV[P_EV < 0]) * self.dt
        
        # Pripremi results
        results = []
        for t in range(self.T):
            hour = t // 4
            minute = (t % 4) * 15
            
            num_charging = np.sum(P_EV[:, t] > 0)
            num_discharging = np.sum(P_EV[:, t] < 0)
            
            results.append({
                'slot': t,
                'time': f"{hour:02d}:{minute:02d}",
                'building_load_kw': round(self.P_building[t], 2),
                'pv_generation_kw': round(P_PV_scaled[t], 2),
                'ev_power_kw': round(np.sum(P_EV[:, t]), 2),
                'grid_power_kw': round(P_grid[t], 2),
                'cost_eur': round(P_grid[t] * self.dt * self.tariff[t]['price_kwh'], 4),
                'tariff_period': self.tariff[t]['period'],
                'num_evs_charging': int(num_charging),
                'num_evs_discharging': int(num_discharging)
            })
        
        kpis = {
            'total_cost_eur': round(total_cost, 2),
            'peak_load_baseline_kw': round(peak_baseline, 2),
            'peak_load_with_v2b_kw': round(peak_v2b, 2),
            'peak_reduction_percent': round(peak_reduction, 2),
            'total_evs': num_evs,
            'evs_meeting_target': int(evs_meeting_target),
            'ev_success_rate_percent': round(success_rate, 2),
            'total_ev_energy_charged_kwh': round(total_charged, 2),
            'total_ev_energy_discharged_kwh': round(total_discharged, 2)
        }
        
        fleet_summary = {
            'num_evs': num_evs,
            'avg_initial_soc': round(np.mean(SoC_init), 3),
            'avg_final_soc': round(np.mean(final_socs), 3),
            'avg_required_soc': round(self.SoC_req, 3),
            'avg_trip_distance_km': round(np.mean(self.trip_dist), 2),
            'simulation_date': simulation_date if simulation_date else 'default (first day)'
        }
        
        print(f"\nSimulation complete!")
        print(f"  Final SOC: {fleet_summary['avg_final_soc']*100:.1f}%")
        print(f"  Success: {kpis['ev_success_rate_percent']:.1f}%")
        print(f"{'='*60}\n")
        
        return {
            'results': results,
            'kpis': kpis,
            'fleet_summary': fleet_summary
        }
    
    def close(self):
        if self.conn:
            self.conn.close()