# algorithm.py - MATRIX-BASED MODEL (prema PDF dokumentu)
"""
V2B Energy Management Algorithm - Matrix Implementation

MATEMATICKI MODEL (Euler diskretizacija):
============================================

1. DISKRETIZACIJA VREMENA:
   Δt = 0.25h (15 minuta)
   T = 96 vremenskih koraka (24h)

2. STANJE NAPUNJENOSTI (SOC):
   Za svako vozilo i: SoC_i(t) ∈ [0.1, 0.9]

   Energija u bateriji:
   E(t) = SoC(t) · B  [kWh]
   gdje je B = kapacitet baterije vozila [kWh]

3. SNAGA I SOC DERIVACIJA:
   Snaga: P(t) = dE(t)/dt

   Iz E(t) = SoC(t) · B slijedi:
   dE(t)/dt = B · dSoC(t)/dt

   Dakle:
   dSoC(t)/dt = (1/B) · P(t)

4. PUNJENJE I PRAZNJENJE S UCINKOVITOSTIMA:
   P(t) = P_punjenje(t) + P_praznjenje(t)

   - P_punjenje(t) >= 0  (puni se baterija EV)
   - P_praznjenje(t) <= 0  (prazni se baterija EV)
   - VAZNO: Ne mogu istovremeno biti oba != 0

   Ucinkovitosti: η_punjenja = η_praznjenja ≈ 0.90-0.98

   Formula za SOC s ucinkovitostima:
   dSoC(t)/dt = (1/B) · (η_punj · P_punj(t) - (1/η_praž) · P_praž(t))

5. EULER DISKRETIZACIJA:
   dSoC(t)/dt ≈ (SoC_{k+1} - SoC_k) / Δt

   Konacna formula:
   SoC_{k+1} = SoC_k + (Δt/B) · (η_punj · P_punj,k - (1/η_praž) · P_praž,k)

6. CILJNI SOC:
   SoC_cilj = 0.9 (90%)

   Energija potrebna za punjenje:
   E_i = (SoC_trazeni - SoC_trenutni) · B_i

7. ENERGETSKA BILANCA SUSTAVA:
   P_mreza(t) = P_zgrada(t) + Σ P_EV_i(t) - P_PV(t)
                              i=1..N

   Gdje je Σ P_EV_i(t):
   - Pozitivno: automobili se pune (povlace energiju)
   - Negativno: automobili podrzavaju zgradu (V2B praznjenje)

8. CILJ OPTIMIZACIJE:
   Minimizirati vrsno opterecenje (peak shaving):
   P_mreza(t) ≤ P_max

   Uz ogranicenja:
   - 0.1 ≤ SoC_i(t) ≤ 0.9  za sve i, t
   - SoC_i(t_odlaska) ≥ SoC_cilj

MATRICE:
- A[i,t]: Availability (prisutnost vozila) - binarna
- P_EV[i,t]: Snaga punjenja/praznjenja [kW]
- SoC_EV[i,t]: State of Charge [0-1]
- B_EV[i]: Kapacitet baterije [kWh]
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
        self.dt = 0.25  # Vremenska diskretizacija: 15 min = 0.25h (Table 3)
        self.T = 96     # Broj vremenskih koraka (24h * 4)

        # EVSE parametri (Table 3 iz PDF-a)
        self.P_EVSE = 3.6    # Charging/discharging power of EVSE [kW]
        self.eta_ch = 0.90   # Charging efficiency (Table 3)
        self.eta_dis = 0.85  # Discharging efficiency (Table 3)

        # SOC ograničenja (iz PDF-a Section 2.4)
        self.SoC_min = 0.10  # Minimum SOC limit
        self.SoC_max = 0.90  # Maximum SOC limit (80% za ESS, 90% za EV)
        self.SoC_req = 0.80  # Ciljni SOC pri odlasku (prema PDF)
        
        # Učitaj profile
        self.P_building = self._load_building_profile()  # [T]
        self.P_PV = self._load_pv_profile()              # [T]
        self.pv_profile = self.P_PV  # Backward compatibility za main.py
        self.tariff = self._load_tariff()                # Dict
        self.ev_catalog = self._load_ev_catalog()        # Dict
        
        print("V2BController initialized (Matrix-based)")
        print(f"  Time steps: {self.T} (dt = {self.dt}h)")
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
        # Gaussove distribucije (iz PDF-a Table 5)
        # Arrival time: μ=8:30 (slot 34), σ=1h (4 slota)
        t_arr = np.random.normal(loc=34, scale=4, size=N)
        t_arr = np.clip(t_arr, 28, 40).astype(int)

        # Departure time: μ=17:00 (slot 68), σ=2h (8 slotova) - prema PDF Table 5
        t_dep = np.random.normal(loc=68, scale=8, size=N)
        t_dep = np.clip(t_dep, 60, 84).astype(int)

        # Trip distance: μ=30km, σ=10km - prema PDF Table 5
        trip_dist = np.random.normal(loc=30, scale=10, size=N)
        trip_dist = np.clip(trip_dist, 10, 80)

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

        # Početni SOC - uniform[0.10, 0.80] (prema dokumentu)
        SoC_init = np.random.uniform(0.10, 0.80, size=N)

        # Dodatne informacije za prioritet
        self.t_arr = t_arr
        self.t_dep = t_dep
        self.trip_dist = trip_dist

        return A, B_EV, P_EV_max, SoC_init
    
    def calculate_required_slots(self, i: int, current_soc: float) -> int:
        """
        Izračunaj potreban broj slot-ova za punjenje prema Equation 8 iz PDF-a

        Formula: Nt = (SOC_trip × Bev) / (Pc × η × Δts)

        Gdje je:
        - SOC_trip: potrebni SOC za putovanje (SoC_req - current_soc)
        - Bev: kapacitet baterije [kWh]
        - Pc: snaga punjenja [kW]
        - η: učinkovitost punjenja
        - Δts: trajanje time slot-a [h]
        """
        soc_needed = max(0, self.SoC_req - current_soc)
        energy_needed = soc_needed * self.B_EV[i]  # kWh

        if energy_needed <= 0:
            return 0

        # Nt = E_needed / (Pc × η × Δt)
        slots_needed = energy_needed / (self.P_EV_max[i] * self.eta_ch * self.dt)
        return int(np.ceil(slots_needed))

    def calculate_priority(self, i: int, t: int, SoC: float) -> int:
        """
        Izračunaj prioritet vozila i u trenutku t
        Prema Algorithm 1 iz PDF-a (Table 1)

        Priority = PrSOC + PrStay + PrTrip + PrBatt (Equation 10)

        Table 1 - Priority Definition:
        ┌──────────┬─────────────┬─────────────┬─────────────┬─────────────┐
        │ Priority │ tstay [h]   │ SoC [%]     │ dtrip [km]  │ Bev [kWh]   │
        ├──────────┼─────────────┼─────────────┼─────────────┼─────────────┤
        │ HIGH [3] │ tstay ≤ 3   │ SoC ≤ 20    │ 30 ≤ dtrip  │ -           │
        │ MID  [2] │ 3 < t < 6   │ 20 < SoC<80 │ 10 < d < 30 │ 30 ≤ Bev    │
        │ LOW  [1] │ 6 ≤ tstay   │ 80 ≤ SoC    │ dtrip ≤ 10  │ Bev < 30    │
        └──────────┴─────────────┴─────────────┴─────────────┴─────────────┘
        """
        PrSOC = 0
        PrStay = 0
        PrTrip = 0
        PrBatt = 0

        # 1. SOC prioritet (niži SOC = viši prioritet za punjenje)
        if SoC <= 0.20:
            PrSOC = 3  # HIGH
        elif 0.20 < SoC < 0.80:
            PrSOC = 2  # MIDDLE
        else:  # SOC >= 0.80
            PrSOC = 1  # LOW

        # 2. Stay time prioritet (kraće vrijeme = viši prioritet)
        stay_hours = (self.t_dep[i] - self.t_arr[i]) * self.dt
        if stay_hours <= 3:
            PrStay = 3  # HIGH
        elif 3 < stay_hours < 6:
            PrStay = 2  # MIDDLE
        else:  # stay >= 6h
            PrStay = 1  # LOW

        # 3. Trip distance prioritet (duži put = viši prioritet) - Table 1
        if self.trip_dist[i] >= 30:  # 30 ≤ dtrip → HIGH
            PrTrip = 3
        elif 10 < self.trip_dist[i] < 30:  # 10 < dtrip < 30 → MIDDLE
            PrTrip = 2
        else:  # dtrip ≤ 10 → LOW
            PrTrip = 1

        # 4. Battery capacity prioritet - Table 1
        if self.B_EV[i] >= 30:  # 30 ≤ Bev → MIDDLE
            PrBatt = 2
        else:  # Bev < 30 → LOW
            PrBatt = 1

        return PrSOC + PrStay + PrTrip + PrBatt
    
    def optimize_charging(self, A: np.ndarray, B_EV: np.ndarray,
                         P_EV_max: np.ndarray, SoC_init: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Glavni algoritam optimizacije - prema PDF flowchartu (Figure 5)

        STRATEGIJA prema PDF-u:
        1. Za svaki time slot provjeriti:
           - Tarifni period (off-peak, mid-peak, on-peak)
           - PV output dostupnost (γ koeficijent)
        2. Za svako vozilo (sortirano po prioritetu):
           - Ako SOC < SOC_trip: PUNJENJE do odlaska (α = +1)
           - Ako SOC >= SOC_trip I on-peak: PRAZNJENJE za peak shaving (α = -1)
           - Inače: idle (α = 0)

        Formule iz PDF-a:
        - Equation 4: Pgrid = Pbuilding + Σ(α × PEV × η) - γ × PPV
        - Equation 8: Nt = (SOC_trip × Bev) / (Pc × η × Δts)
        - Equation 9: C = Min Σ Celec(ts) × PC × η

        Koeficijenti (Equations 5-7):
        - α = +1 (punjenje), -1 (pražnjenje), 0 (idle) za EV
        - γ = +1 (PV dostupan), 0 (PV nedostupan)

        Returns:
            P_EV[i,t]: Matrica snaga (+ punjenje, - pražnjenje)
            SoC_EV[i,t]: Matrica SOC stanja
        """
        N = A.shape[0]

        # Inicijaliziraj matrice
        P_EV = np.zeros((N, self.T))
        SoC_EV = np.zeros((N, self.T + 1))
        SoC_EV[:, 0] = SoC_init

        # Spremanje za cjelovitu flotu
        self.B_EV = B_EV
        self.P_EV_max = P_EV_max

        # Izracunaj potrebni SOC za povratak (SOC_trip)
        # SOC_trip = (trip_distance / max_range) + safety_margin
        SoC_trip = np.zeros(N)
        for i in range(N):
            # Pretpostavi 150km range za prosjecnu bateriju
            max_range = 150  # km
            SoC_trip[i] = min(0.90, (self.trip_dist[i] / max_range) + 0.20)

        # Efektivna snaga punjenja/pražnjenja - minimum od EVSE i EV kapaciteta
        # Prema Table 3: EVSE je 3.6 kW
        P_charge = np.minimum(P_EV_max, self.P_EVSE)  # Charging power [kW]
        P_discharge = np.minimum(P_EV_max, self.P_EVSE)  # Discharging power [kW]

        # Glavna petlja po vremenskim koracima (ts = 0 do 95)
        for t in range(self.T):
            tariff = self.tariff[t]
            period = tariff['period'].replace('_', '-')
            price = tariff['price_kwh']

            # Dohvati dostupna vozila
            available = np.where(A[:, t] == 1)[0]

            if len(available) == 0:
                # Nema dostupnih vozila, prenesi SOC
                SoC_EV[:, t + 1] = SoC_EV[:, t]
                continue

            # Izracunaj prioritete za sva dostupna vozila
            priorities = np.array([
                self.calculate_priority(i, t, SoC_EV[i, t])
                for i in available
            ])

            # Sortiraj po prioritetu (najvisi prvo)
            order = np.argsort(-priorities)
            sorted_evs = available[order]

            # Za svako vozilo odluci: punjenje, praznjenje ili idle
            for i in sorted_evs:
                current_soc = SoC_EV[i, t]
                slots_to_dep = self.t_dep[i] - t
                soc_needed = SoC_trip[i]

                # Prema flowchartu: provjeri SOC < SOC_trip?
                if current_soc < soc_needed:
                    # PUNJENJE - vozilo MORA puniti (nedovoljno za put)
                    # α = +1 (Equation 5)
                    E_req = max(0, (self.SoC_req - current_soc) * B_EV[i])

                    if slots_to_dep > 0:
                        # Raspodijeli energiju na preostale slotove
                        P = min(
                            P_EV_max[i],
                            E_req / (slots_to_dep * self.eta_ch * self.dt)
                        )
                    else:
                        P = P_EV_max[i]

                    # Off-peak: maksimalno punjenje (jeftino!) - Equation 9 optimizacija
                    if period == 'off-peak':
                        # Puni maksimalno tijekom off-peak za minimalan trošak
                        P = min(P_EV_max[i], E_req / (self.eta_ch * self.dt))

                    if P > 0.1:
                        P_EV[i, t] = P  # α = +1, Pozitivno = punjenje

                else:
                    # SOC >= SOC_trip - vozilo ima dovoljno za put
                    # Sada odluči: PUNJENJE ili V2B PRAŽNJENJE ovisno o periodu

                    # Minimalni SOC za V2B pražnjenje (ne prazni ispod ovog)
                    SoC_min_discharge = max(soc_needed + 0.10, 0.50)

                    # Prag za V2B pražnjenje - počni prazniti već od 70%
                    SoC_v2b_threshold = 0.70

                    if period == 'on-peak' and current_soc >= SoC_v2b_threshold:
                        # ON-PEAK + SOC >= 70%: V2B PRAŽNJENJE za peak shaving
                        # α = -1 (Equation 6)

                        # Koliko može prazniti
                        max_discharge_soc = current_soc - SoC_min_discharge

                        if max_discharge_soc > 0.05 and slots_to_dep > 2:
                            # Prazni agresivno - cijeli raspoloživi kapacitet
                            discharge_energy = max_discharge_soc * B_EV[i]
                            P = min(
                                P_EV_max[i],
                                discharge_energy / (self.eta_dis * self.dt)
                            )
                            if P > 0.5:
                                P_EV[i, t] = -P  # α = -1, V2B pražnjenje

                    elif period == 'on-peak' and current_soc < SoC_v2b_threshold:
                        # ON-PEAK + SOC < 70%: idle ili minimalno punjenje
                        # Čekaj jeftiniji period za punjenje, ali provjeri ima li vremena

                        mid_peak_slots = 0
                        for future_t in range(t, min(t + slots_to_dep, self.T)):
                            future_period = self.tariff[future_t]['period'].replace('_', '-')
                            if future_period in ['off-peak', 'mid-peak']:
                                mid_peak_slots += 1

                        E_req = max(0, (SoC_v2b_threshold - current_soc) * B_EV[i])
                        slots_needed = int(np.ceil(E_req / (P_EV_max[i] * self.eta_ch * self.dt)))

                        if mid_peak_slots < slots_needed:
                            # Mora puniti tijekom on-peak
                            remaining_energy = E_req - (mid_peak_slots * P_EV_max[i] * self.eta_ch * self.dt)
                            if remaining_energy > 0:
                                P = min(P_EV_max[i], remaining_energy / (self.eta_ch * self.dt))
                                if P > 0.1:
                                    P_EV[i, t] = P

                    elif period == 'off-peak':
                        # OFF-PEAK: UVIJEK puni maksimalno (najjeftinije!)
                        E_req = max(0, (self.SoC_req - current_soc) * B_EV[i])
                        if E_req > 0:
                            P = min(P_EV_max[i], E_req / (self.eta_ch * self.dt))
                            if P > 0.1:
                                P_EV[i, t] = P  # α = +1

                    elif period == 'mid-peak':
                        # MID-PEAK: puni do 80% ako treba
                        if current_soc < self.SoC_req:
                            E_req = max(0, (self.SoC_req - current_soc) * B_EV[i])

                            # Provjeri ima li off-peak slotova
                            off_peak_slots = 0
                            for future_t in range(t, min(t + slots_to_dep, self.T)):
                                future_period = self.tariff[future_t]['period'].replace('_', '-')
                                if future_period == 'off-peak':
                                    off_peak_slots += 1

                            slots_needed = int(np.ceil(E_req / (P_EV_max[i] * self.eta_ch * self.dt)))

                            if off_peak_slots < slots_needed:
                                # Puni tijekom mid-peak
                                remaining_energy = E_req - (off_peak_slots * P_EV_max[i] * self.eta_ch * self.dt)
                                if remaining_energy > 0:
                                    P = min(P_EV_max[i], remaining_energy / (self.eta_ch * self.dt))
                                    if P > 0.1:
                                        P_EV[i, t] = P

            # Ažuriraj SOC za sva vozila prema Euler diskretizaciji
            # Formula: SoC_{k+1} = SoC_k + (Δt/B) · (η_punj · P_punj,k - (1/η_praž) · P_praž,k)
            for i in range(N):
                P_punj = max(0, P_EV[i, t])   # Snaga punjenja (>= 0)
                P_praz = min(0, P_EV[i, t])   # Snaga praznjenja (<= 0, negativna)

                # Euler diskretizacija s učinkovitostima
                # dSoC = (Δt/B) · (η_punj · P_punj - (1/η_praž) · |P_praž|)
                delta_SoC = (self.dt / B_EV[i]) * (
                    self.eta_ch * P_punj - (1.0 / self.eta_dis) * abs(P_praz)
                )

                SoC_EV[i, t + 1] = SoC_EV[i, t] + delta_SoC

                # Primijeni ograničenja: SoC ∈ [0.1, 0.9]
                SoC_EV[i, t + 1] = np.clip(SoC_EV[i, t + 1], self.SoC_min, self.SoC_max)

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
        P_EV, SoC_EV = self.optimize_charging(A, B_EV, P_EV_max, SoC_init)
        
        # Koristi pv_profile (moze biti vec skaliran od main.py)
        P_PV_scaled = self.pv_profile if hasattr(self, 'pv_profile') else (self.P_PV * pv_scaling)

        # Izracunaj energetsku bilancu sustava (formula s papira):
        # P_mreza(t) = P_zgrada(t) + Σ P_EV_i(t) - P_PV(t)
        #                           i=1..N
        # Gdje Σ P_EV_i(t) moze biti:
        #   - Pozitivno: automobili se pune (povlace energiju iz mreze)
        #   - Negativno: automobili podrzavaju zgradu (V2B praznjenje)
        P_grid = self.P_building + np.sum(P_EV, axis=0) - P_PV_scaled
        P_grid = np.maximum(P_grid, 0)  # Grid ne moze biti negativan (nema izvoz)
        
        # Izračunaj troškove
        total_cost = 0.0
        for t in range(self.T):
            cost = P_grid[t] * self.dt * self.tariff[t]['price_kwh']
            total_cost += cost
        
        # KPI pokazatelji (Formula 14 iz PDF-a)
        peak_baseline = np.max(self.P_building - P_PV_scaled)
        peak_v2b = np.max(P_grid)
        peak_reduction = ((peak_baseline - peak_v2b) / peak_baseline * 100) if peak_baseline > 0 else 0
        
        # Uspješnost punjenja - dva nivoa
        # 1. Minimalni cilj: 65% (dovoljno za V2B peak shaving)
        # 2. Puni cilj: 80%
        final_socs = SoC_EV[:, self.T]
        SoC_min_target = 0.65  # Minimalni prihvatljivi SOC nakon V2B
        evs_meeting_min_target = np.sum(final_socs >= SoC_min_target)
        evs_meeting_target = np.sum(final_socs >= self.SoC_req)  # 80%
        success_rate = (evs_meeting_min_target / num_evs) * 100  # Bazirano na 65%
        
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
            'evs_meeting_min_target': int(evs_meeting_min_target),  # >= 65%
            'evs_meeting_target': int(evs_meeting_target),  # >= 80%
            'ev_success_rate_percent': round(success_rate, 2),  # Bazirano na 65%
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