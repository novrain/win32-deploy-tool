call npm i pm2 -g
call npm i pm2-windows-startup -g
call stop.bat
call pm2 start bin\www -i 1 --name "axNurse"
call pm2-startup install
call pm2 save