@echo off
echo Starting npm server...
start cmd /k "cd client && npm start"

echo Waiting for server to start...
timeout /t 5 /nobreak

echo Launching game instances...
for /l %%x in (1, 1, 8) do (
    start "" "http://localhost:3000"
) 