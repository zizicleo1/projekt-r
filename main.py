# main.py - ENHANCED VERSION
"""
V2B Digital Twin - FastAPI Backend with Croatian tariffs and building types

New endpoints:
- GET  /api/building-types    - List available building types
- GET  /api/tariff/croatia    - Get Croatian dynamic tariff
- POST /api/simulate-advanced - Run simulation with building type selection
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import sqlite3
import pandas as pd
import uvicorn
from typing import Optional, List
import json
from datetime import datetime
from pathlib import Path

# Inicijalizacija FastAPI app
app = FastAPI(
    title="V2B Digital Twin API - Enhanced",
    description="Vehicle-to-Building with Croatian tariffs and multiple building types",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class SimulationParams(BaseModel):
    """Parametri za simulaciju"""
    num_evs: int = Field(
        default=30, 
        ge=10, 
        le=50, 
        description="Broj elektricnih vozila (10-50)"
    )
    scenario_name: Optional[str] = Field(
        default="default",
        description="Naziv scenarija"
    )
    pv_scaling: Optional[float] = Field(
        default=1.0,
        ge=0.0,
        le=5.0,
        description="PV skaliranje faktora (0.0-5.0)"
    )
    building_type: Optional[str] = Field(
        default="office",
        description="Tip zgrade (office, school, hospital, residential, shopping_center)"
    )
    use_croatian_tariff: Optional[bool] = Field(
        default=True,
        description="Koristi hrvatsku dinamicku tarifu"
    )

class CompareRequest(BaseModel):
    """Request za usporedbu scenarija"""
    scenario_ids: List[int] = Field(
        default=[1, 2, 4],
        description="Lista ID-eva scenarija za usporedbu"
    )

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    """Root endpoint - API informacije"""
    return {
        "status": "V2B Digital Twin API Running - ENHANCED",
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat(),
        "new_features": [
            "Croatian dynamic tariff support",
            "Multiple building types (office, school, hospital, etc.)",
            "Enhanced simulation parameters",
            "Improved energy management algorithm"
        ],
        "endpoints": {
            "health": "/api/health",
            "profiles": "/api/profiles",
            "building_types": "/api/building-types [NEW]",
            "croatian_tariff": "/api/tariff/croatia [NEW]",
            "simulate": "/api/simulate [POST]",
            "simulate_advanced": "/api/simulate-advanced [POST] [NEW]",
            "kpis": "/api/kpis",
            "scenarios": "/api/scenarios",
            "compare": "/api/compare [POST]"
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = sqlite3.connect('v2b_system.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        table_stats = {}
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            table_stats[table] = count
        
        conn.close()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "status": "connected",
                "path": "v2b_system.db",
                "tables": table_stats,
                "table_count": len(tables)
            },
            "system": {
                "algorithm": "available",
                "api_version": "3.0.0",
                "croatian_tariff": "enabled",
                "building_types": "enabled"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Health check failed: {str(e)}"
        )

@app.get("/api/building-types")
def get_building_types():
    """
    Dohvati dostupne tipove zgrada
    """
    try:
        config_file = Path('building_profiles.json')
        
        if not config_file.exists():
            return {
                "status": "error",
                "message": "building_profiles.json not found",
                "available_types": ["office"]
            }
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        building_types = []
        
        for key, value in config['building_types'].items():
            building_types.append({
                "id": key,
                "name": value['name'],
                "description": value['description'],
                "annual_consumption_kwh": value['annual_consumption_kwh'],
                "working_hours": value['working_hours']
            })
        
        return {
            "status": "success",
            "building_types": building_types,
            "total_types": len(building_types)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching building types: {str(e)}"
        )

@app.get("/api/tariff/croatia")
def get_croatian_tariff():
    """
    Dohvati hrvatsku dinamicku tarifu
    """
    try:
        tariff_file = Path('croatian_tariff.json')
        
        if not tariff_file.exists():
            raise HTTPException(
                status_code=404,
                detail="Croatian tariff file not found"
            )
        
        with open(tariff_file, 'r', encoding='utf-8') as f:
            tariff_data = json.load(f)
        
        return {
            "status": "success",
            "tariff": tariff_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching Croatian tariff: {str(e)}"
        )

@app.get("/api/profiles")
def get_profiles():
    """Dohvati sve dostupne profile i kataloge"""
    conn = sqlite3.connect('v2b_system.db')
    
    try:
        # 1. EV Katalog
        ev_catalog_query = "SELECT * FROM ev_catalog ORDER BY id"
        ev_catalog = pd.read_sql(ev_catalog_query, conn).to_dict('records')
        
        # 2. Tariff
        tariff_query = """
            SELECT time_slot, hour, period, price_kwh 
            FROM tariff 
            WHERE time_slot % 4 = 0
            ORDER BY time_slot
        """
        tariff = pd.read_sql(tariff_query, conn).to_dict('records')
        
        # 3. Building profil uzorak
        building_query = """
            SELECT timestamp, power_kw, time_slot
            FROM building_load
            ORDER BY timestamp
            LIMIT 96
        """
        building = pd.read_sql(building_query, conn)
        
        if len(building) == 0:
            building_sample = []
        else:
            building_sample = building.head(24).to_dict('records')
        
        # 4. PV profil uzorak
        pv_query = """
            SELECT timestamp, power_kw, time_slot
            FROM pv_generation
            ORDER BY timestamp
            LIMIT 96
        """
        pv = pd.read_sql(pv_query, conn)
        
        if len(pv) == 0:
            pv_sample = []
        else:
            pv_sample = pv.head(24).to_dict('records')
        
        # 5. EV Schedule uzorak
        ev_schedule_query = """
            SELECT * FROM ev_schedule 
            ORDER BY ev_id 
            LIMIT 10
        """
        ev_schedule = pd.read_sql(ev_schedule_query, conn).to_dict('records')
        
        return {
            "status": "success",
            "data": {
                "ev_catalog": ev_catalog,
                "tariff": tariff,
                "building_profile_sample": building_sample,
                "pv_profile_sample": pv_sample,
                "ev_schedule_sample": ev_schedule
            },
            "info": {
                "ev_models": len(ev_catalog),
                "tariff_periods": len(set(t['period'] for t in tariff)),
                "time_resolution": "15 minutes",
                "daily_slots": 96
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching profiles: {str(e)}"
        )
    finally:
        conn.close()

@app.post("/api/simulate")
def run_simulation(params: SimulationParams):
    """
    Pokreni V2B simulaciju - BASIC VERSION
    """
    from algorithm import V2BController
    
    if not 10 <= params.num_evs <= 50:
        raise HTTPException(
            status_code=400, 
            detail="num_evs must be between 10 and 50"
        )
    
    try:
        print(f"\n{'='*60}")
        print(f"Starting simulation:")
        print(f"   - EVs: {params.num_evs}")
        print(f"   - Scenario: {params.scenario_name}")
        print(f"   - PV scaling: {params.pv_scaling}x")
        print(f"{'='*60}\n")
        
        controller = V2BController('v2b_system.db')
        
        if params.pv_scaling != 1.0:
            controller.pv_profile = controller.pv_profile * params.pv_scaling
            print(f"PV profile scaled by {params.pv_scaling}x")
        
        simulation_data = controller.run_simulation(
            num_evs=params.num_evs,
            scenario_name=params.scenario_name
        )
        
        controller.close()
        
        print(f"\nSimulation completed successfully!")
        print(f"   - Total cost: {simulation_data['kpis']['total_cost_eur']:.2f} EUR")
        print(f"   - Peak reduction: {simulation_data['kpis']['peak_reduction_percent']:.1f}%\n")
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "parameters": {
                "num_evs": params.num_evs,
                "scenario_name": params.scenario_name,
                "pv_scaling": params.pv_scaling
            },
            "data": simulation_data
        }
        
    except Exception as e:
        print(f"\nSimulation error: {str(e)}\n")
        raise HTTPException(
            status_code=500, 
            detail=f"Simulation failed: {str(e)}"
        )

@app.post("/api/simulate-advanced")
def run_simulation_advanced(params: SimulationParams):
    """
    Pokreni V2B simulaciju - ADVANCED s odabirom tipa zgrade
    """
    from algorithm import V2BController
    
    if not 10 <= params.num_evs <= 50:
        raise HTTPException(
            status_code=400, 
            detail="num_evs must be between 10 and 50"
        )
    
    try:
        print(f"\n{'='*60}")
        print(f"ADVANCED Simulation:")
        print(f"   - EVs: {params.num_evs}")
        print(f"   - Building type: {params.building_type}")
        print(f"   - PV scaling: {params.pv_scaling}x")
        print(f"   - Croatian tariff: {params.use_croatian_tariff}")
        print(f"{'='*60}\n")
        
        # Regeneriraj building profil ako je drugaciji tip
        from database import V2BDatabase
        
        db = V2BDatabase('v2b_system.db')
        
        # Generiraj building profil za odabrani tip
        db.generate_building_profile_by_type(params.building_type)
        
        # Ucitaj tarifu
        db.load_tariff(use_croatian=params.use_croatian_tariff)
        
        db.close()
        
        # Pokreni simulaciju
        controller = V2BController('v2b_system.db')
        
        if params.pv_scaling != 1.0:
            controller.pv_profile = controller.pv_profile * params.pv_scaling
            print(f"PV profile scaled by {params.pv_scaling}x")
        
        simulation_data = controller.run_simulation(
            num_evs=params.num_evs,
            scenario_name=f"{params.building_type}_{params.num_evs}EVs"
        )
        
        controller.close()
        
        print(f"\nSimulation completed successfully!")
        print(f"   - Total cost: {simulation_data['kpis']['total_cost_eur']:.2f} EUR")
        print(f"   - Peak reduction: {simulation_data['kpis']['peak_reduction_percent']:.1f}%\n")
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "parameters": {
                "num_evs": params.num_evs,
                "building_type": params.building_type,
                "pv_scaling": params.pv_scaling,
                "croatian_tariff": params.use_croatian_tariff,
                "scenario_name": params.scenario_name
            },
            "data": simulation_data
        }
        
    except Exception as e:
        print(f"\nSimulation error: {str(e)}\n")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Simulation failed: {str(e)}"
        )

@app.get("/api/kpis")
def get_quick_kpis():
    """Brzi KPI pregled"""
    from algorithm import V2BController
    
    try:
        print("\nRunning quick KPI check (50 EVs)...")
        
        controller = V2BController('v2b_system.db')
        simulation_data = controller.run_simulation(
            num_evs=50, 
            scenario_name="quick-check"
        )
        controller.close()
        
        print("KPI check completed\n")
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "kpis": simulation_data['kpis'],
            "fleet_summary": simulation_data['fleet_summary'],
            "note": "Quick simulation with 50 EVs"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"KPI calculation failed: {str(e)}"
        )

@app.get("/api/scenarios")
def get_predefined_scenarios():
    """Dohvati listu preddefiniranih scenarija"""
    scenarios = [
        {
            "id": 1,
            "name": "Scenario 1: Minimal (10 EVs)",
            "num_evs": 10,
            "pv_scaling": 0.5,
            "building_type": "office",
            "description": "10 EVs, minimal load, 15kW PV",
            "features": ["Small fleet", "Low load", "Test scenario"]
        },
        {
            "id": 2,
            "name": "Scenario 2: Small (20 EVs)",
            "num_evs": 20,
            "pv_scaling": 0.7,
            "building_type": "office",
            "description": "20 EVs with smart charging, 20kW PV",
            "features": ["Priority charging", "Balanced load", "Efficient management"]
        },
        {
            "id": 3,
            "name": "Scenario 3: Medium (30 EVs)",
            "num_evs": 30,
            "pv_scaling": 1.0,
            "building_type": "office",
            "description": "30 EVs, 30kW PV system",
            "features": ["Medium fleet", "Standard PV", "Optimal balance"]
        },
        {
            "id": 4,
            "name": "Scenario 4: Large (40 EVs)",
            "num_evs": 40,
            "pv_scaling": 1.3,
            "building_type": "office",
            "description": "40 EVs with V2B discharge, 40kW PV",
            "features": ["Large fleet", "V2B discharge", "Peak shaving"]
        },
        {
            "id": 5,
            "name": "Scenario 5: Maximum (50 EVs)",
            "num_evs": 50,
            "pv_scaling": 1.7,
            "building_type": "office",
            "description": "50 EVs, maximum capacity, 50kW PV",
            "features": ["Max fleet", "High PV capacity", "Full optimization"]
        },
        {
            "id": 6,
            "name": "Scenario 6: School (25 EVs)",
            "num_evs": 25,
            "pv_scaling": 1.0,
            "building_type": "school",
            "description": "School building with 25 EVs",
            "features": ["School profile", "Day usage only", "Summer vacation"]
        },
        {
            "id": 7,
            "name": "Scenario 7: Hospital (30 EVs)",
            "num_evs": 30,
            "pv_scaling": 1.2,
            "building_type": "hospital",
            "description": "Hospital 24/7 operation",
            "features": ["24/7 operation", "High reliability", "Constant load"]
        }
    ]
    
    return {
        "status": "success",
        "scenarios": scenarios,
        "total_scenarios": len(scenarios)
    }

@app.post("/api/compare")
def compare_scenarios(request: CompareRequest):
    """Usporedi vise scenarija"""
    from algorithm import V2BController
    
    scenario_params = {
        1: {"num_evs": 10, "name": "Minimal", "pv_scaling": 0.5, "building_type": "office"},
        2: {"num_evs": 20, "name": "Small", "pv_scaling": 0.7, "building_type": "office"},
        3: {"num_evs": 30, "name": "Medium", "pv_scaling": 1.0, "building_type": "office"},
        4: {"num_evs": 40, "name": "Large", "pv_scaling": 1.3, "building_type": "office"},
        5: {"num_evs": 50, "name": "Maximum", "pv_scaling": 1.7, "building_type": "office"},
        6: {"num_evs": 25, "name": "School", "pv_scaling": 1.0, "building_type": "school"},
        7: {"num_evs": 30, "name": "Hospital", "pv_scaling": 1.2, "building_type": "hospital"}
    }
    
    results = []
    
    try:
        print(f"\n{'='*60}")
        print(f"Comparing {len(request.scenario_ids)} scenarios...")
        print(f"{'='*60}\n")
        
        for scenario_id in request.scenario_ids:
            if scenario_id not in scenario_params:
                print(f"Skipping unknown scenario ID: {scenario_id}")
                continue
            
            params = scenario_params[scenario_id]
            
            print(f"Running Scenario {scenario_id}: {params['name']} ({params['num_evs']} EVs, {params['building_type']})...")
            
            # Regeneriraj building profil
            from database import V2BDatabase
            db = V2BDatabase('v2b_system.db')
            db.generate_building_profile_by_type(params['building_type'])
            db.close()
            
            controller = V2BController('v2b_system.db')
            
            if params['pv_scaling'] != 1.0:
                controller.pv_profile = controller.pv_profile * params['pv_scaling']
            
            sim_data = controller.run_simulation(
                num_evs=params['num_evs'],
                scenario_name=params['name']
            )
            
            results.append({
                "scenario_id": scenario_id,
                "scenario_name": params['name'],
                "parameters": params,
                "kpis": sim_data['kpis'],
                "fleet_summary": sim_data['fleet_summary']
            })
            
            controller.close()
            
            print(f"   Cost: {sim_data['kpis']['total_cost_eur']:.2f} EUR, "
                  f"Peak reduction: {sim_data['kpis']['peak_reduction_percent']:.1f}%\n")
        
        print(f"{'='*60}")
        print(f"Comparison completed for {len(results)} scenarios")
        print(f"{'='*60}\n")
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "comparison": results,
            "scenarios_compared": len(results)
        }
    
    except Exception as e:
        print(f"\nComparison failed: {str(e)}\n")
        raise HTTPException(
            status_code=500, 
            detail=f"Comparison failed: {str(e)}"
        )

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": f"The endpoint {request.url.path} does not exist",
            "available_endpoints": [
                "/",
                "/api/health",
                "/api/profiles",
                "/api/building-types",
                "/api/tariff/croatia",
                "/api/simulate",
                "/api/simulate-advanced",
                "/api/kpis",
                "/api/scenarios",
                "/api/compare"
            ]
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "detail": str(exc)
        }
    )

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print(" V2B Digital Twin API Server - ENHANCED")
    print("="*60)
    print(f" URL: http://localhost:8000")
    print(f" Swagger Docs: http://localhost:8000/docs")
    print(f" ReDoc: http://localhost:8000/redoc")
    print(f" Version: 3.0.0")
    print(f" Features: Croatian tariff, Building types")
    print("="*60 + "\n")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        log_level="info"
    )