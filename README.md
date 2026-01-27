# V2B Digital Twin - Upute za instalaciju i pokretanje

## 1. Instalacija potrebnih programa

### Git
- Preuzmi s: https://git-scm.com/download/win
- Pokreni installer, koristi default postavke
- Provjera: `git --version`

### Python 3.10+
- Preuzmi s: https://www.python.org/downloads/
- **VAZNO:** Oznaci "Add Python to PATH" tijekom instalacije
- Provjera: `python --version`

### Node.js 18+ (ukljucuje npm)
- Preuzmi LTS verziju s: https://nodejs.org/
- Pokreni installer
- Provjera: `node --version` i `npm --version`

### Visual Studio Code (opcionalno)
- Preuzmi s: https://code.visualstudio.com/

## 2. Kloniranje projekta

```bash
git clone <url-repozitorija>

```

## 3. Instalacija Python ovisnosti (backend)

```bash
pip install fastapi uvicorn pandas numpy httpx pydantic
```

Ili ako postoji requirements.txt:
```bash
pip install -r requirements.txt
```

## 4. Instalacija Node.js ovisnosti (frontend)

```bash
cd frontend
npm install
```

## 5. Pokretanje projekta

### Terminal 1 - Backend (FastAPI)
```bash
python main.py
```
Backend radi na: http://localhost:8000

### Terminal 2 - Frontend (React)
```bash
cd frontend
npm run dev
```
Frontend radi na: http://localhost:3000

## 6. Pristup aplikaciji

- **Aplikacija:** http://localhost:3000
- **API dokumentacija:** http://localhost:8000/docs
