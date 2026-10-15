# Regenerates campus-map.jpg from the unmodified official map.
# Run from this folder: python3 stylise-map.py   (requires Pillow)
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageOps, ImageEnhance
src=Image.open('source-official-campus-map-2025.jpg').convert('RGB')
W,H=src.size
d=ImageDraw.Draw(src)
bg=(194,180,172)
d.rectangle([0,712,500,H],fill=bg)      # legend boxes (key text not used in-game)
d.rectangle([496,842,656,H],fill=bg)
im=src.crop((60,10,1450,900))
w,h=im.size
gray=ImageOps.grayscale(im)
sepia=ImageOps.colorize(gray,black=(38,30,20),mid=(150,128,92),white=(246,234,206))
S=im.convert('HSV').split()[1]
lowsat=S.point(lambda s: max(0,min(255,int(255-s*3.2))))          # 255 where grey/white
mixed=Image.composite(sepia,im,lowsat.point(lambda v:int(v*0.9)))
# background grey (lum ~181) -> parchment
bgm=gray.point(lambda l: max(0,min(255,int(255*(1-abs(l-181)/26)))))
bgm=ImageChops.multiply(bgm,lowsat).filter(ImageFilter.GaussianBlur(1.5))
parch=Image.new('RGB',(w,h),(231,214,178))
mixed=Image.composite(parch,mixed,bgm.point(lambda v:int(v*0.78)))
# soften greens toward forest/olive and lower overall saturation a touch
mixed=ImageEnhance.Color(mixed).enhance(0.86)
warm=Image.new('RGB',(w,h),(255,236,200))
mixed=ImageChops.multiply(mixed,warm)
mixed=ImageEnhance.Brightness(mixed).enhance(1.06)
# paper grain: coarse mottling + fine grain
coarse=Image.effect_noise((w//6,h//6),40).resize((w,h),Image.BICUBIC).filter(ImageFilter.GaussianBlur(4))
coarse=coarse.point(lambda v: int(222+ (v-128)*0.22))
fine=Image.effect_noise((w,h),18).point(lambda v:int(236+(v-128)*0.12))
grain=ImageChops.multiply(coarse,fine).point(lambda v:min(255,int(v*1.13)))
mixed=ImageChops.multiply(mixed,Image.merge('RGB',(grain,grain,grain)))
# aged vignette
rg=Image.radial_gradient('L').resize((w,h),Image.BICUBIC)   # 0 centre -> 255 edge
vig=rg.point(lambda v: max(0,min(255,int((v-150)*2.0))))
edge=Image.new('RGB',(w,h),(150,118,74))
out=Image.composite(edge,mixed,vig.point(lambda v:int(v*0.62)))
out.save('campus-map.jpg',quality=80,optimize=True,progressive=True)
print(out.size)
