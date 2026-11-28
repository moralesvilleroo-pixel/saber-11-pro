import json
from datetime import datetime, timedelta, timezone
from fsrs import Scheduler, Card, Rating
s = Scheduler(enable_fuzzing=False)
base = datetime(2026,1,1,12,0,tzinfo=timezone.utc)
# escenarios: lista de (ratings, offsets en minutos desde el inicio)
scen = {
 "aprendizaje_basico": [(3,0),(3,1),(3,11)],
 "facil_directo": [(4,0)],
 "dificil_y_olvido": [(2,0),(3,8),(3,30),(1,60*24*5),(3,60*24*5+10),(3,60*24*9)],
 "ease_hell": [(3,0),(3,1),(3,11)] + [(1,60*24*(3+i*2)) for i in range(6)],
 "repasos_tardios": [(3,0),(3,1),(3,11),(3,60*24*30),(2,60*24*90),(4,60*24*200)],
 "mismo_dia_en_review": [(4,0),(3,60*5),(1,60*6),(2,60*6+10),(3,60*24*2)],
}
out={}
for name, steps in scen.items():
    c=Card(); res=[]
    for r,off in steps:
        t=base+timedelta(minutes=off)
        c,_=s.review_card(c,Rating(r),t)
        res.append({"rating":r,"offsetMin":off,"state":c.state.name,"step":c.step,"stability":c.stability,"difficulty":c.difficulty,"dueOffsetMin":(c.due-base).total_seconds()/60})
    out[name]=res
print(json.dumps(out,indent=1))
