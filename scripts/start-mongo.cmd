@echo off
REM Starts MongoDB locally (no Windows service, no admin rights needed).
REM Binaries: C:\Users\HP\mongodb  |  Data: C:\Users\HP\mongodb-data\db
REM Using 6.0.14 -- newer builds (8.x) segfault on this machine's older VC++ runtime.
"C:\Users\HP\mongodb\mongodb-win32-x86_64-windows-6.0.14\bin\mongod.exe" --dbpath "C:\Users\HP\mongodb-data\db" --port 27017 --bind_ip 127.0.0.1
