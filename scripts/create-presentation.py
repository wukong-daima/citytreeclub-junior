"""Build the Korean presentation and render every page for visual QA."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
import fitz
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/citytreeclub-junior-presentation.pdf'
TMP=ROOT/'tmp/pdfs'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('KR',str(TMP/'NanumGothic-Regular.ttf')))
pdfmetrics.registerFont(TTFont('KB',str(TMP/'NanumGothic-Bold.ttf')))
W,H=960,540
GREEN='#214E3A'; INK='#20362C'; MUTED='#617568'; CREAM='#F7F5EB'; PALE='#E5EDDA'; GOLD='#E9BB65'; CORAL='#D88566'
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('시티트리클럽 주니어 | 차별화 전략과 구현 소개')
c.setAuthor('서울환경연합과 함께하는 팀 나무늘보')
TOTAL=12

def rect(x,y,w,h,color,r=0):
    c.setFillColor(HexColor(color))
    c.setStrokeColor(HexColor(color))
    if r:c.roundRect(x,y,w,h,r,fill=1,stroke=0)
    else:c.rect(x,y,w,h,fill=1,stroke=0)

def text(s,x,y,size=18,color=INK,bold=False):
    c.setFont('KB' if bold else 'KR',size);c.setFillColor(HexColor(color));c.drawString(x,y,s)

def wrap(s,width,size):
    lines=[]
    for paragraph in s.split('\n'):
        current=''
        for char in paragraph:
            if pdfmetrics.stringWidth(current+char,'KR',size)>width:
                lines.append(current);current=char
            else:current+=char
        lines.append(current)
    return lines

def para(s,x,y,width,size=17,color=INK,leading=None):
    leading=leading or size*1.55
    for line in wrap(s,width,size):text(line,x,y,size,color);y-=leading
    return y

def base(n,kicker,title,subtitle=None):
    rect(0,0,W,H,CREAM)
    text('CITY TREE CLUB JUNIOR',44,507,9,GREEN,True)
    text(kicker,44,463,12,MUTED,True)
    title_size=30
    while pdfmetrics.stringWidth(title,'KB',title_size)>872:title_size-=1
    text(title,44,417,title_size,GREEN,True)
    if subtitle:para(subtitle,44,386,872,13,MUTED)
    rect(44,43,872,1,'#D7DECF')
    text('서울환경연합과 함께하는 팀 나무늘보',44,25,9,MUTED)
    text(f'{n:02d} / {TOTAL}',860,25,10,MUTED)

def note(s):
    rect(44,65,872,49,PALE,10)
    text('발표 포인트',60,95,10,GREEN,True)
    para(s,137,94,754,12,INK,16)

def card(x,y,w,h,label,title,body,color='#FFFFFF'):
    rect(x,y,w,h,color,16);text(label,x+20,y+h-29,11,MUTED,True)
    text(title,x+20,y+h-62,21,GREEN,True)
    para(body,x+20,y+h-94,w-40,15,INK,24)

def tree(x,y,scale=1):
    c.saveState();c.translate(x,y);c.scale(scale,scale)
    rect(-8,0,16,105,'#956E4B',5)
    for xx,yy,rr,col in [(-35,91,40,'#88AB6D'),(33,96,41,'#6F9A5A'),(0,130,45,'#91B477'),(0,80,40,'#71995B')]:
        c.setFillColor(HexColor(col));c.circle(xx,yy,rr,fill=1,stroke=0)
    for xx in [-10,10]:c.setFillColor(HexColor(GREEN));c.circle(xx,101,2.6,fill=1,stroke=0)
    c.setStrokeColor(HexColor(GREEN));c.setLineWidth(2);c.arc(-8,85,8,97,180,180)
    c.restoreState()

def arrow(x,y,w=32):
    c.setStrokeColor(HexColor(GREEN));c.setLineWidth(2);c.line(x,y,x+w,y);c.line(x+w-6,y+5,x+w,y);c.line(x+w-6,y-5,x+w,y)

def page():c.showPage()

# 1
rect(0,0,W,H,GREEN)
text('CITY TREE CLUB JUNIOR',48,486,13,'#DCEBC9',True)
text('시티트리클럽 주니어',48,363,39,'#FFFFFF',True)
para('관찰을 넘어,\n매일 돌보고 싶은 나무 친구로',48,298,590,27,'#F4F0D9',43)
text('원본의 시민 관찰 철학에 성장·놀이·참여 동기를 더한 프로토타입',48,174,15,'#DCEBC9')
text('서울환경연합과 함께하는 팀 나무늘보 제작',48,84,13,'#F4F0D9',True)
text('김현진 · 김나현 · 박서연 · 정경섭 · 최미혜',48,57,12,'#DCEBC9')
tree(764,174,1.35);text('2026.09.30  |  구현 기준 발표자료',664,32,10,'#DCEBC9');page()

# 2
base(2,'01  WHY','나무를 보호하는 관심, 어떻게 오래 이어갈까?','원본의 가치를 계승하고, 일상 속 재방문 동기를 더합니다.')
card(44,154,405,196,'원본에서 이어받은 가치','나무와 관계 맺기','나무 배정과 애칭, 건강·사진 기록,\n시민의 관심과 커뮤니티 활동.\n나무를 단순한 시설이 아닌 이웃으로 봅니다.')
card(469,154,447,196,'주니어가 추가한 경험','관심을 성장으로 보여주기','위치 선택 → 돌봄 → 성장 → 놀이 → 다음 목표.\n작은 행동에 눈에 보이는 피드백을 주어\n다시 찾아올 이유를 만듭니다.',PALE)
note('“원본을 대체하는 서비스가 아니라, 시민 관찰에 반복 참여의 재미를 더한 확장 제안입니다.”');page()

# 3
base(3,'02  DIFFERENTIATION','무엇을 계승했고, 무엇을 바꾸었나?','원본 공개 화면·자료 조사와 주니어 구현을 비교했습니다. 원본에 해당 기능이 전혀 없다는 단정은 아닙니다.')
cols=[44,206,502]; widths=[158,292,414]
for x,w,label in zip(cols,widths,['비교 항목','원본에서 확인한 경험','주니어의 차별화 초점']):rect(x,324,w,35,GREEN);text(label,x+12,335,13,'#FFFFFF',True)
rows=[('나무 만나기','동 단위 선택·무작위 배정','지정 위치·반경 안, 가까운 최대 10그루 추첨'),('지속 참여','애칭·건강·사진 관찰과 교류','나무별 XP·성장 단계·돌봄 횟수·다음 목표'),('놀이 방식','관찰·현장 참여 중심','이동 해충·타이밍 가지 돌봄·흙 블록 퍼즐'),('이용 흐름','지도와 기록 등 웹 기능','고정 프레임·기능별 화면 전환·실습 안내'),('이벤트 확장','계절 관찰·워크숍 등 캠페인','누적 포인트 기반 기간제 메시지·장식 체험')]
for i,row in enumerate(rows):
    y=324-(i+1)*38
    for x,w,cell in zip(cols,widths,row):rect(x,y,w,37,'#FFFFFF' if i%2==0 else '#EAF0E2');text(cell,x+12,y+13,12,INK,bold=x==44)
note('“차별화는 기능의 개수보다, 나무를 만난 뒤 관심이 이어지는 흐름에 있습니다.”');page()

# 4
base(4,'03  MATCHING','내가 정한 위치에서, 만날 수 있는 나무로','동 단위 선택에서 더 나아가 위치와 반경을 직접 정하는 만남 방식입니다.')
steps=[('01','기준 위치','현재 위치 확인\n또는 지도·검색 위치 지정'),('02','반경 선택','300m · 500m\n1km · 2km'),('03','가까운 후보','반경 안의 거리순\n최대 10그루'),('04','무작위 배정','후보 중 한 그루를\n나의 나무로 만나기')]
for i,(num,title,body) in enumerate(steps):
    x=44+i*222;card(x,195,205,150,num,title,body,PALE if i==3 else '#FFFFFF')
    if i<3:arrow(x+207,267,12)
para('반경은 도보 경로가 아닌 직선거리입니다. 후보가 10그루 미만이면 실제 후보만 사용하고,\n후보가 없으면 위치나 반경을 변경하도록 안내합니다. 현재 나무 데이터는 서울숲 샘플입니다.',44,164,872,13,MUTED,20)
note('“무작위 만남의 즐거움은 유지하되, 내가 찾아가기 쉬운 범위 안에서 만납니다.”');page()

# 5
base(5,'04  GROWTH','내가 들인 공이, 나무의 성장으로 보입니다','실제 나무를 대신 키우는 것이 아니라, 관심과 기록을 가상 정원의 성장으로 표현합니다.')
for i,(label,value) in enumerate([('첫 이름 선물','+10 XP'),('물 주기','+10 XP'),('거름 주기','+15 XP'),('게임별 완료','+25 XP')]):
    x=44+i*222;rect(x,257,205,95,'#FFFFFF',14);text(label,x+18,322,14,MUTED);text(value,x+18,279,29,GREEN,True)
rect(44,153,872,80,PALE,14);text('성장 단계',64,207,13,GREEN,True)
stages=['0 XP','30 XP','80 XP','160 XP','300 XP']
for i,s in enumerate(stages):
    x=204+i*136;rect(x,181,100,10,GREEN if i<3 else '#C7D7B9',5);text(s,x,160,12,INK)
text('돌봄 횟수·누적 포인트·다음 단계까지 남은 XP를 함께 표시',64,134,13,MUTED)
note('“반복 클릭 경쟁보다 매일의 작은 관심을 보상하도록, 돌봄과 게임의 하루 보상 횟수를 제한했습니다.”');page()

# 6
base(6,'05  PLAY','세 게임, 세 가지 다른 조작 경험','단순히 다섯 곳을 누르던 방식에서 이동·타이밍·공간 퍼즐로 바꾸었습니다.')
for x,title,body in [(44,'잎사귀 구조대','기어가고 날아다니는 대상\n30초 안에 5마리 잡기\n클릭·터치·키보드 조작'),(340,'가지 돌봄 연습','왕복하는 바를 초록 구간에!\n45초 안에 5번 성공\n빗나가면 다시 도전'),(636,'폭신폭신 흙 정원','흙 블록을 이동·회전·낙하\n가로줄 5개를 채우면 성공\n8 × 12 보드와 다음 블록')]:
    card(x,145,280,212,'게임 속 가상 돌봄',title,body)
rect(373,169,210,22,'#E8D7BB',7);rect(436,169,84,22,'#80B17B',3);rect(472,166,4,29,GREEN)
for i in range(6):rect(675+(i%3)*22,165+(i//3)*22,19,19,'#A27B51' if i<4 else '#7FA268',3)
for x,y in [(96,176),(152,189),(230,174)]:c.setFillColor(HexColor('#83AA6C'));c.circle(x,y,9,fill=1,stroke=0)
note('“놀이의 조작감은 다르게, 보상은 같은 돌봄 성장으로 연결합니다. 실제 생물 제거·가지치기를 권하지 않습니다.”');page()

# 7
base(7,'06  APP EXPERIENCE','스크롤하는 홈페이지에서, 실행하는 앱 화면으로','웹 주소는 그대로 두고 고정 프레임 안의 기능 화면을 전환합니다.')
rect(44,141,507,217,'#FFFFFF',16);rect(58,322,479,24,GREEN,6);text('시티트리클럽 주니어                         내 나무',72,330,11,'#FFFFFF')
tree(176,197,.6);text('이름 · 성장 게이지',286,285,16,GREEN,True);rect(286,261,180,10,PALE,5);rect(286,261,113,10,GREEN,5)
for i,s in enumerate(['물 주기','거름 주기','꾸미기']):rect(283+i*72,216,66,31,PALE,8);text(s,290+i*72,227,10)
rect(58,153,479,35,PALE,8);text('나무 찾기     내 나무     돌봄 게임     관찰장     이벤트',76,166,11,GREEN,True)
rect(487,194,40,25,GOLD,9);text('보관',495,202,9)
para('고정 내비게이션\n기능을 누르면 해당 화면으로 이동\n\n작은 기록 보관함\n백업 내보내기·가져오기·주소 공유\n\n단계별 입력\n위치 선택·사진 관찰을 다음/이전으로',588,334,319,15,INK,24)
text('설명용 화면 모식도 · 긴 상세창은 내부 스크롤 허용',60,122,10,MUTED)
note('“주요 행동에 집중할 수 있도록 소개, 기록, 게임을 한 페이지에 길게 쌓지 않았습니다.”');page()

# 8
base(8,'07  PARTICIPATION','포인트가 쌓이면, 현실의 추억을 제안합니다','나무에 이름표·하고 싶은 말·고백 메시지·장식을 연결하는 기간제 이벤트 구상입니다.')
card(44,173,269,176,'조건','누적 100 포인트','이름표 · 메시지 · 고백 · 장식\n1일 / 3일 / 7일 선택\n현재는 이 기기의 체험 신청',PALE)
card(333,173,279,176,'운영 전제','검토와 허가 먼저','운영자 검토와 관리 주체 허가\n나무에 해가 없는 설치 방식\n기간 종료 후 회수 책임 확정')
card(632,173,284,176,'안전 원칙','나무를 위한 기억','못·철사·접착제 사용 금지\n승인된 독립 안내대 등 우선\n무단 설치를 유도하지 않음')
text('현재 실제 응모 접수·당첨·현장 설치가 운영되는 서비스는 아닙니다.',44,139,14,CORAL,True)
note('“장식 자체가 목적이 아니라, 나무를 아끼는 관계가 특별한 기억으로 이어지게 하는 제안입니다.”');page()

# 9
base(9,'08  IMPACT','우리가 만들고 싶은 변화','나무가 사라지지 않게 하는 힘은 게임 점수가 아니라, 사람들의 지속적인 관심입니다.')
for i,(num,title,body) in enumerate([('1','발견','내 생활권의 나무 알아보기'),('2','애착','이름과 돌봄으로 관계 맺기'),('3','관찰','사진과 변화 기록 쌓기'),('4','보호 참여','이상 징후와 관리 문제 살피기')]):
    x=44+i*222;rect(x,205,205,138,PALE if i%2 else '#FFFFFF',14);text(num,x+18,309,28,GREEN,True);text(title,x+18,268,19,GREEN,True);para(body,x+18,236,170,13)
para('효과는 앞으로 검증해야 합니다. 재방문율, 관찰 기록의 지속성, 나무 상태 변화 기록,\n운영기관에 전달 가능한 시민 관찰의 품질을 지표로 삼을 수 있습니다.',44,165,872,15,MUTED,24)
note('“벌목이나 민원이 줄었다는 효과를 아직 입증한 것은 아닙니다. 먼저 지속적인 관심이 생기는지 검증합니다.”');page()

# 10
base(10,'09  HONEST SCOPE','지금 되는 것과, 운영을 위해 필요한 것','현재 버전은 GitHub Pages에 배포된 브라우저 저장형 프로토타입입니다.')
card(44,145,426,213,'현재 구현','무료 웹에서 체험 가능','위치·반경 선택과 샘플 나무 배정\n나무별 성장·물·거름·꾸미기·세 게임\n사진 관찰·백업/복원·앱형 화면\n이벤트 조건 확인과 기기 내 체험 신청',PALE)
card(490,145,426,213,'향후 연동','실제 운영에는 별도 준비','검증된 실제 나무 위치 데이터\n현장 방문 인증과 운영기관 검토\n실물 행사 승인·설치·회수 체계\n계정·기기 동기화·다른 참여자와 공유')
note('“기록과 사진은 이 브라우저에만 저장됩니다. 사이트 주소 공유는 개인 기록 공유가 아니며, 데이터 삭제 전 백업이 필요합니다.”');page()

# 11
base(11,'10  LIVE DEMO','발표 중에는 이 순서로 보여주세요','동작 시연은 샘플 나무 기준입니다. 기존 기록이 있는 브라우저에서는 일부 일일 보상이 완료되어 있을 수 있습니다.')
items=['나무 찾기: 위치와 반경을 정하고 배정 창 확인','내 나무: 애칭·남은 XP·물주기 효과 확인','돌봄 게임: 이동 해충 → 타이밍 게이지 → 흙 블록','관찰장과 이벤트: 기록·100포인트 조건·보관함 확인']
for i,s in enumerate(items):rect(44,298-i*47,603,36,'#FFFFFF',9);text(f'{i+1:02d}',58,309-i*47,13,GREEN,True);text(s,93,309-i*47,13)
url='https://wukong-daima.github.io/citytreeclub-junior/'
q=QrCodeWidget(url);bounds=q.getBounds();d=Drawing(160,160,transform=[160/(bounds[2]-bounds[0]),0,0,160/(bounds[3]-bounds[1]),0,0]);d.add(q);renderPDF.draw(d,c,710,171)
text('사이트 열기',748,154,14,GREEN,True)
text('wukong-daima.github.io/citytreeclub-junior/',44,133,14,GREEN)
c.linkURL(url,(44,125,625,150),relative=0,thickness=0)
note('“나무를 만나고, 돌보고, 기록하고, 다음 목표를 확인하는 짧은 여정으로 시연합니다.”');page()

# 12
base(12,'11  NEXT & SOURCES','나무를 아끼는 마음이, 다시 방문할 이유가 되도록','팀 나무늘보 | 김현진 · 김나현 · 박서연 · 정경섭 · 최미혜')
para('다음 단계: 실제 데이터 연결 → 시민 사용성 검증 → 안전한 현장 이벤트 시범 운영',44,342,870,20,GREEN,31)
rect(44,159,872,143,'#FFFFFF',14)
text('비교 근거와 확인 범위',64,276,16,GREEN,True)
sources=[('원본 웹 서비스','https://citytree.club/'),('서울환경연합 캠페인·공개 게시물','https://www.seoulkfem.or.kr/citytreeclub/'),('주니어 구현과 소스','https://github.com/wukong-daima/citytreeclub-junior')]
for i,(label,url) in enumerate(sources):
    y=246-i*29;text(label,64,y,12,INK,True);text(url,321,y,11,MUTED);c.linkURL(url,(321,y-4,890,y+13),relative=0,thickness=0)
para('비교 기준: 2026.09.30 공개 화면·HTML/JS·게시물 조사 및 주니어 구현. 원본 로그인 후 모든 흐름을\n실사용 검증한 비교는 아닙니다. 구성도는 설명용이며 원본 이미지 대신 자체 도형을 사용했습니다.',44,136,872,11,MUTED,16)
note('한 문장 요약: “시민 관찰의 가치를, 나무를 키우는 즐거움과 일상적인 참여로 연결했습니다.”');page()

c.save()
doc=fitz.open(OUT)
for i,p in enumerate(doc):p.get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(str(TMP/f'slide-{i+1:02d}.png'))
for batch in range(2):
    sheet=Image.new('RGB',(1440,1215),'#dddddd')
    for j in range(6):
        thumb=Image.open(TMP/f'slide-{batch*6+j+1:02d}.png').convert('RGB')
        thumb.thumbnail((720,405));sheet.paste(thumb,((j%2)*720,(j//2)*405))
    sheet.save(TMP/f'contact-{batch+1}.png')
assert len(doc)==TOTAL
for i,p in enumerate(doc):
    assert len(p.get_text().strip())>30, f'Empty page {i+1}'
print(f'{OUT}\n{len(doc)} pages generated and rendered; embedded Korean font.')
