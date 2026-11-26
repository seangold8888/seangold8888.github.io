import numpy as np, cv2
def ball(f, minA=1500):
    f=f.astype(np.int16); r,g,b=f[...,0],f[...,1],f[...,2]
    m=((g<0.6*r)&(g>0.3*r)&(b<0.42*r)&(r>110)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((11,11),np.uint8))
    n,lab,stats,cent=cv2.connectedComponentsWithStats(m)
    if n<2: return None
    k=1+np.argmax(stats[1:,cv2.CC_STAT_AREA]); x,y,w,h,a=stats[k]
    if a<minA: return None
    R=w/2; cx=x+R
    if w>1.25*h and y>0: R=h/2; cx=x+w-R     # 팔과 붙어 옆으로 길면: 공은 앞(오른쪽) 끝
    cy = y+R if y>0 else y+h-R
    return cx,cy,R,int(a),(int(x),int(y),int(w),int(h))
