import subprocess,sys
shots=[
 ("01","2-treino.png",0,"Treinos feitos <em>para você</em>","Séries, cargas e vídeos para o seu nível e equipamentos"),
 ("02","6-plano.png",0,"Dieta <em>personalizada</em> toda semana","Cardápio com metas de calorias, macros e lista de compras"),
 ("03","4-medidas.png",0,"Acompanhe sua <em>evolução</em>","Peso, gordura, músculo e volume de treino em gráficos"),
 ("04","1-home.png",250,"Seu dia <em>em um só lugar</em>","Refeições, água e próximos treinos sempre à mão"),
 ("05","7-coach.png",0,"Coach Otto <em>com IA</em>","Tire dúvidas sobre treino e alimentação a qualquer hora"),
]
tpl=open('tpl.html').read()
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for n,img,off,t,s in shots:
    h=tpl.replace("{IMG}",img).replace("{OFF}",str(off)).replace("{T}",t).replace("{S}",s)
    open(f"s{n}.html","w").write(h)
    subprocess.run([chrome,"--headless=new","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=1","--window-size=1080,1920","--virtual-time-budget=6000",f"--screenshot=fitgen-screen-{n}.png",f"file://{sys.argv[1]}/s{n}.html"],stderr=subprocess.DEVNULL)
