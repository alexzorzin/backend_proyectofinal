# Guía de comandos

## 1) Vista INFO:
Levantar el server en un puerto como el 8081 y de url escribir: 127.0.0.1:8081/info

## 2) nodemon:
1) Inicio en modo CLUSTER en el puerto 8081:

    nodemon src/index.js -p 8081 -m CLUSTER
    
2) Inicio en modo FORK en el puerto 8081:

    nodemon src/index.js -p 8081 -m FORK  // ese FORK no es necesario porque viene por default

## 3) forever:
1) Inicio en modo FORK en puerto 8081:
    forever src/index.js -p 8081
2) Inicio en modo CLUSTER en puerto 8082:
    forever src/index.js -m CLUSTER -p 8082  

## 4) nginx:

1) Inicio 4 conexiones en modo FORK - watch:

    pm2 start ./src/main.js --name="server-8082" --watch -- 8082
    
    pm2 start ./src/main.js --name="server-8083" --watch -- 8083
    
    pm2 start ./src/main.js --name="server-8084" --watch -- 8084
    
    pm2 start ./src/main.js --name="server-8085" --watch -- 8085
    

2) Para iniciar en modo CLUSTER:

    pm2 start ./src/main.js --name="server-8082" --watch -i max -- 8082

para finalizar los servers FORK: pm2 delete all.
Y para detenerlos sin eliminarlos: pm2 stop all