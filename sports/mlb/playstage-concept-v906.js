const STYLE_ID='tso-mlb-playstage-concept-v906-style';
const ROOT='.tso-mlb-playstage-v901';
let installed=false,observer=null,raf=0;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const venueName=root=>String(root.querySelector('.ps-wall')?.dataset?.venue||'BALLPARK').trim()||'BALLPARK';

function ensureStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps905-stadium{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-stage{height:610px!important;perspective:1450px!important;perspective-origin:50% 88%!important;transform-style:preserve-3d!important;background:#030b14!important;overflow:hidden!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-stage:before{content:''!important;position:absolute!important;inset:0!important;z-index:78!important;pointer-events:none!important;background:radial-gradient(ellipse at 50% 70%,transparent 0 43%,rgba(0,0,0,.08) 73%,rgba(0,0,0,.28) 100%),linear-gradient(180deg,rgba(39,91,139,.03),transparent 28%,rgba(0,0,0,.11) 100%)!important;mix-blend-mode:normal!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-stage:after{content:''!important;position:absolute!important;inset:0!important;z-index:79!important;pointer-events:none!important;background:linear-gradient(90deg,rgba(0,0,0,.19),transparent 9% 91%,rgba(0,0,0,.19)),linear-gradient(180deg,rgba(255,255,255,.015),transparent 24% 88%,rgba(0,0,0,.18));box-shadow:inset 0 0 92px rgba(0,0,0,.42),inset 0 -70px 100px rgba(0,0,0,.19)!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-sky{z-index:0!important;inset:0 0 58% 0!important;background:radial-gradient(ellipse at 50% 106%,rgba(54,104,151,.52),transparent 47%),radial-gradient(circle at 82% 17%,rgba(53,91,131,.3),transparent 21%),radial-gradient(circle at 17% 10%,rgba(29,57,91,.32),transparent 25%),linear-gradient(180deg,#030b15 0%,#071525 45%,#10283f 100%)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-lights{display:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-wall{z-index:8!important;top:33.2%!important;height:11.2%!important;background:linear-gradient(180deg,#164e49 0%,#0c6555 16%,#0a584d 72%,#063a35 100%)!important;border-top:3px solid rgba(135,185,174,.58)!important;border-bottom:7px solid #032a28!important;box-shadow:0 -5px 0 rgba(2,14,19,.72),0 11px 24px rgba(0,0,0,.5)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-wall:after{z-index:1!important;top:auto!important;bottom:7px!important;color:rgba(236,250,246,.58)!important;font-size:16px!important;letter-spacing:.24em!important;text-shadow:0 2px 5px rgba(0,0,0,.88)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-grass{z-index:4!important;top:41.7%!important;background:repeating-linear-gradient(99deg,rgba(255,255,255,.026) 0 54px,rgba(0,0,0,.026) 54px 108px),radial-gradient(ellipse at 50% 3%,rgba(124,184,102,.28),transparent 43%),linear-gradient(180deg,#4a9856 0%,#3a824a 48%,#2b673e 100%)!important;filter:saturate(1.07) contrast(1.035)!important;box-shadow:inset 0 25px 34px rgba(0,0,0,.08)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-grass:after{content:''!important;position:absolute!important;inset:0!important;background:repeating-radial-gradient(ellipse at 50% 112%,transparent 0 63px,rgba(241,255,241,.024) 65px 69px,transparent 71px 130px),linear-gradient(180deg,rgba(255,255,255,.015),transparent 24%,rgba(0,0,0,.06));pointer-events:none!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-infield{z-index:9!important;width:81%!important;height:55.5%!important;top:73.6%!important;left:50%!important;transform:translate(-50%,-50%) rotateX(1deg)!important;clip-path:polygon(50% 0,98.8% 54%,82% 75%,65% 100%,35% 100%,18% 75%,1.2% 54%)!important;border-radius:40% 40% 7% 7%!important;background:radial-gradient(ellipse at 50% 31%,#d6aa77 0 13%,#c79664 14% 18%,transparent 19%),radial-gradient(ellipse at 50% 82%,rgba(244,210,169,.26),transparent 43%),repeating-linear-gradient(15deg,rgba(255,255,255,.022) 0 2px,rgba(99,54,29,.018) 2px 5px),linear-gradient(180deg,#c58b5a 0%,#bd7f4f 52%,#a96840 100%)!important;box-shadow:inset 0 1px 0 rgba(255,239,215,.43),inset 0 -13px 24px rgba(77,39,21,.2),0 10px 30px rgba(0,0,0,.19)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-infield-grass{z-index:10!important;width:49.5%!important;height:31.8%!important;top:65.4%!important;left:50%!important;transform:translate(-50%,-50%)!important;clip-path:polygon(50% 0,100% 58%,50% 100%,0 58%)!important;background:repeating-linear-gradient(100deg,rgba(255,255,255,.021) 0 34px,rgba(0,0,0,.022) 34px 68px),linear-gradient(180deg,#4c9655,#337744)!important;box-shadow:0 0 0 1px rgba(0,0,0,.09),inset 0 8px 18px rgba(255,255,255,.015)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-mound{z-index:15!important;width:79px!important;height:29px!important;top:64.3%!important;background:radial-gradient(ellipse at 42% 27%,#e0b684 0%,#c58d59 52%,#996139 100%)!important;box-shadow:inset 0 2px 4px rgba(255,241,218,.3),0 5px 12px rgba(0,0,0,.43)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-foul{z-index:15!important;bottom:3.1%!important;height:63%!important;width:2px!important;background:rgba(255,255,255,.95)!important;box-shadow:0 0 4px rgba(255,255,255,.5)!important}.ps-foul.left{transform:rotate(-39.2deg)!important}.ps-foul.right{transform:rotate(39.2deg)!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-base{z-index:17!important;background:linear-gradient(145deg,#fff,#d9e2e8)!important;border:1px solid rgba(58,75,85,.34)!important;box-shadow:0 4px 8px rgba(0,0,0,.55)!important}.ps-home{z-index:17!important;box-shadow:0 4px 9px rgba(0,0,0,.58)!important}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps906-broadcast{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none;transform-style:preserve-3d}
.ps906-haze{position:absolute;inset:0 0 52% 0;background:radial-gradient(ellipse at 50% 90%,rgba(111,162,201,.11),transparent 48%),radial-gradient(circle at 7% 43%,rgba(220,239,255,.14),transparent 17%),radial-gradient(circle at 93% 43%,rgba(220,239,255,.14),transparent 17%)}
.ps906-stars{position:absolute;inset:0 0 70% 0;opacity:.46;background:radial-gradient(circle,#d8efff 0 .7px,transparent 1px) 9% 18%/71px 47px,radial-gradient(circle,#fff 0 .6px,transparent 1px) 29% 4%/91px 59px}
.ps906-skyline{position:absolute;left:16%;right:16%;top:14%;height:20%;opacity:.75;clip-path:polygon(0 100%,0 74%,4% 74%,4% 51%,8% 51%,8% 67%,12% 67%,12% 41%,17% 41%,17% 62%,22% 62%,22% 27%,26% 27%,26% 58%,31% 58%,31% 43%,37% 43%,37% 69%,42% 69%,42% 33%,47% 33%,47% 61%,51% 61%,51% 22%,55% 22%,55% 55%,60% 55%,60% 39%,66% 39%,66% 68%,72% 68%,72% 30%,77% 30%,77% 58%,82% 58%,82% 45%,87% 45%,87% 70%,92% 70%,92% 50%,97% 50%,97% 76%,100% 76%,100% 100%);background:linear-gradient(180deg,#0a1a29,#030a11)}
.ps906-skyline:after{content:'';position:absolute;inset:0;background:radial-gradient(circle,#ffd987 0 1px,transparent 1.35px) 2px 4px/19px 14px;opacity:.29}
.ps906-deck{position:absolute;top:18%;width:39%;height:12%;background:linear-gradient(180deg,#172b3d 0%,#091622 100%);border-bottom:4px solid rgba(141,169,186,.25);box-shadow:0 7px 18px rgba(0,0,0,.6)}.ps906-deck.left{left:-2%;clip-path:polygon(0 29%,100% 0,100% 100%,0 100%)}.ps906-deck.right{right:-2%;clip-path:polygon(0 0,100% 29%,100% 100%,0 100%)}
.ps906-deck:after{content:'';position:absolute;inset:18% 0 0;background:radial-gradient(circle,#cddbe3 0 1.1px,transparent 1.6px) 0 0/13px 9px,radial-gradient(circle,#b72f3d 0 1px,transparent 1.55px) 6px 4px/17px 10px,radial-gradient(circle,#376f94 0 1px,transparent 1.5px) 2px 6px/20px 11px;opacity:.82}
.ps906-bowl{position:absolute;top:25.3%;height:16.9%;width:43%;background:linear-gradient(180deg,#1b3346,#07131f 88%);box-shadow:0 -4px 0 rgba(117,145,161,.17),0 10px 24px rgba(0,0,0,.57);overflow:hidden}.ps906-bowl.left{left:-2%;clip-path:polygon(0 16%,100% 0,100% 100%,0 100%)}.ps906-bowl.right{right:-2%;clip-path:polygon(0 0,100% 16%,100% 100%,0 100%)}
.ps906-bowl:before{content:'';position:absolute;inset:5% 0 0;background:radial-gradient(circle,#d3dee4 0 1.25px,transparent 1.8px) 0 0/12px 8px,radial-gradient(circle,#bb3945 0 1.15px,transparent 1.7px) 5px 3px/16px 10px,radial-gradient(circle,#2b6488 0 1.15px,transparent 1.7px) 2px 5px/19px 11px;opacity:.92}.ps906-bowl:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 20px,rgba(184,207,219,.12) 21px 22px,rgba(0,0,0,.35) 23px 26px)}
.ps906-board{position:absolute;left:50%;top:18.7%;width:252px;height:118px;transform:translateX(-50%) perspective(800px) rotateX(-1.5deg);padding:8px;background:linear-gradient(145deg,#405866,#0b1b27 35%,#1d3845 75%,#07131c);border:2px solid rgba(126,157,173,.68);box-shadow:0 0 0 4px rgba(3,14,21,.94),0 13px 25px rgba(0,0,0,.7),0 0 34px rgba(42,140,220,.12)}
.ps906-screen{height:100%;border:1px solid rgba(78,158,219,.45);background:radial-gradient(circle at 50% 43%,rgba(21,111,199,.4),transparent 36%),repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 3px),linear-gradient(180deg,#06182c,#020914);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font:900 15px/.92 'Barlow Condensed',Impact,sans-serif;letter-spacing:.055em;text-shadow:0 2px 4px #000}
.ps906-mark{position:relative;width:45px;height:45px;margin-bottom:5px;border:3px solid #2d9fff;border-radius:50%;box-shadow:0 0 17px rgba(45,159,255,.58),inset 0 0 13px rgba(45,159,255,.2)}.ps906-mark:before,.ps906-mark:after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%}.ps906-mark:before{width:23px;height:23px;border:3px solid #fff}.ps906-mark:after{width:8px;height:8px;background:#ff3d47;box-shadow:0 0 10px #ff3d47}.ps906-screen strong{font-size:21px}.ps906-screen span{font-size:14px}.ps906-screen small{font-size:7px;color:#99bbd6;letter-spacing:.16em;margin-top:5px}
.ps906-board-post{position:absolute;left:50%;top:37.7%;width:7px;height:35px;transform:translateX(-50%);background:linear-gradient(90deg,#09151c,#6a8491,#0a171e);box-shadow:-73px 0 0 -2px #415b67,73px 0 0 -2px #415b67}
.ps906-light{position:absolute;top:4.7%;width:14px;height:210px;border-left:2px solid rgba(179,202,214,.52);border-right:2px solid rgba(179,202,214,.52);background:repeating-linear-gradient(45deg,transparent 0 8px,rgba(142,168,183,.46) 9px 11px),repeating-linear-gradient(-45deg,transparent 0 8px,rgba(142,168,183,.31) 9px 11px);filter:drop-shadow(0 8px 6px rgba(0,0,0,.39))}.ps906-light:before{content:'';position:absolute;left:-27px;top:-4px;width:64px;height:36px;border:2px solid rgba(139,163,177,.43);background:radial-gradient(circle,#fff 0 2px,#e3f3ff 2.9px,rgba(205,232,255,.42) 3.8px,transparent 4.8px) 1px 1px/11px 10px;box-shadow:0 0 22px rgba(225,243,255,.8);filter:drop-shadow(0 0 4px white)}.ps906-light.l1{left:5.5%;transform:rotate(-1deg)}.ps906-light.l2{left:27%;top:7.4%;height:175px}.ps906-light.r2{right:27%;top:7.4%;height:175px}.ps906-light.r1{right:5.5%;transform:rotate(1deg)}
.ps906-foulpole{position:absolute;top:21.7%;width:3px;height:137px;background:#f1d13d;box-shadow:0 0 5px rgba(255,219,57,.36)}.ps906-foulpole.left{left:11.9%}.ps906-foulpole.right{right:11.9%}.ps906-foulpole:before{content:'';position:absolute;top:0;left:-1px;width:11px;height:68px;border:1px solid rgba(241,209,61,.64);background:repeating-linear-gradient(0deg,transparent 0 5px,rgba(241,209,61,.54) 6px 7px)}
.ps906-battereye{position:absolute;left:50%;top:31.4%;width:31%;height:10.4%;transform:translateX(-50%);background:linear-gradient(180deg,#0a2527,#061b1e);border:1px solid rgba(101,143,140,.24);box-shadow:inset 0 0 30px rgba(0,0,0,.32),0 5px 11px rgba(0,0,0,.4)}
.ps906-adrail{position:absolute;left:8%;right:8%;top:34.1%;height:6.2%;display:grid;grid-template-columns:1fr 1.15fr 1.4fr 1.15fr 1fr;gap:7px;align-items:center}.ps906-adrail i{height:60%;border:1px solid rgba(205,230,225,.16);background:linear-gradient(180deg,rgba(8,44,45,.76),rgba(3,26,30,.9));box-shadow:0 4px 8px rgba(0,0,0,.32)}.ps906-adrail i:nth-child(3){height:78%;background:linear-gradient(180deg,rgba(7,36,55,.9),rgba(2,15,27,.97))}
.ps906-venue{position:absolute;left:50%;top:38.45%;transform:translateX(-50%);max-width:34%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(236,249,246,.65);font:900 9px/1 'Barlow Condensed',Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;text-shadow:0 2px 4px #001}
.ps906-dugout{position:absolute;top:43%;width:18%;height:6%;background:linear-gradient(180deg,#0b2027,#051317);border-top:2px solid rgba(141,169,175,.22);box-shadow:0 5px 12px rgba(0,0,0,.4)}.ps906-dugout.left{left:6%;transform:skewX(-14deg)}.ps906-dugout.right{right:6%;transform:skewX(14deg)}.ps906-dugout:after{content:'';position:absolute;left:7%;right:7%;top:30%;height:2px;background:rgba(197,218,222,.19);box-shadow:0 9px 0 rgba(197,218,222,.09)}
.ps906-net{position:absolute;left:20%;right:20%;top:44%;bottom:0;opacity:.055;background:repeating-linear-gradient(90deg,transparent 0 18px,rgba(224,240,247,.8) 19px 20px),repeating-linear-gradient(0deg,transparent 0 18px,rgba(224,240,247,.8) 19px 20px);mask-image:linear-gradient(to bottom,#000,transparent 72%)}
.ps906-plate-dirt{position:absolute;z-index:13;left:50%;bottom:-8%;width:43%;height:36%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at 50% 42%,rgba(216,174,127,.62),rgba(172,109,65,.38) 56%,transparent 72%);filter:blur(.2px)}
.ps906-box{position:absolute;z-index:18;bottom:4.4%;width:52px;height:80px;border:2px solid rgba(255,255,255,.66);border-top-color:rgba(255,255,255,.42);opacity:.8;transform:perspective(250px) rotateX(47deg)}.ps906-box.left{left:calc(50% - 80px)}.ps906-box.right{right:calc(50% - 80px)}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi{transform-style:preserve-3d!important;filter:drop-shadow(0 12px 8px rgba(0,0,0,.49)) drop-shadow(0 1px 1px rgba(255,255,255,.13))!important;will-change:left,top,transform}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi>.ps905-rig{overflow:visible!important;filter:drop-shadow(0 2px 1px rgba(0,0,0,.38)) drop-shadow(-1px -1px 1px rgba(255,255,255,.09))!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps905-head{filter:drop-shadow(0 1.5px 1.2px rgba(0,0,0,.25))}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps905-torso{filter:drop-shadow(0 2px 1.2px rgba(0,0,0,.22))}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps905-arm,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps905-leg{filter:drop-shadow(1px 1.5px .8px rgba(0,0,0,.22))}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps-batter{width:122px!important;height:170px!important;transform:translate(-50%,-66.5%)!important}.ps-chibi.ps-pitcher{width:91px!important;height:130px!important}.ps-chibi.ps-catcher{width:95px!important;height:128px!important}.ps-chibi.ps-runner{width:83px!important;height:118px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi[data-pos="LF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi[data-pos="CF"],html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi[data-pos="RF"]{width:46px!important;height:67px!important}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi:after{content:'';position:absolute;left:18%;right:18%;bottom:0;height:8%;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.28),transparent 70%);transform:translateY(32%);z-index:-1;pointer-events:none}

html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps-windup .ps905-shin.l{animation:ps906WindupShin .48s cubic-bezier(.2,.72,.2,1) both}.ps-chibi.ps-windup .ps905-fore.r{animation:ps906HandBreakFore .48s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps-pitcher.ps-throwing .ps905-shin.l{animation:ps906PitchShinFront .6s cubic-bezier(.17,.75,.16,1) both}.ps-chibi.ps-pitcher.ps-throwing .ps905-shin.r{animation:ps906PitchShinBack .6s ease both}.ps-chibi.ps-pitcher.ps-throwing .ps905-torso{animation:ps906PitchTorso .6s cubic-bezier(.15,.78,.18,1) both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps-swing .ps905-fore.l,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps-swing .ps905-fore.r{animation:ps906SwingFore .56s cubic-bezier(.13,.77,.18,1) both}.ps-chibi.ps-swing .ps905-shin.l{animation:ps906SwingFrontShin .56s ease both}.ps-chibi.ps-swing .ps905-shin.r{animation:ps906SwingBackShin .56s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps-running .ps905-shin.l{animation:ps906RunShin .3s ease-in-out infinite alternate}.ps-chibi.ps-running .ps905-shin.r{animation:ps906RunShin .3s ease-in-out infinite alternate-reverse}.ps-chibi.ps-running .ps905-torso{animation:ps906RunTorso .3s ease-in-out infinite alternate}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps-catching .ps905-fore.l{animation:ps906CatchFore .51s ease both}.ps-chibi.ps-catching .ps905-torso{animation:ps906CatchTorso .51s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps905-grounder .ps905-shin.l,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps905-grounder .ps905-shin.r{animation:ps906FieldShin .64s ease both}.ps-chibi.ps905-grounder .ps905-torso{animation:ps906FieldTorso .64s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps905-turn .ps905-torso{animation:ps906TurnTorso .67s cubic-bezier(.2,.7,.18,1) both}.ps-chibi.ps905-turn .ps905-fore.r{animation:ps906TurnFore .67s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps905-catcher-throw .ps905-torso{animation:ps906CatcherTorso .73s ease both}.ps-chibi.ps905-catcher-throw .ps905-fore.r{animation:ps906CatcherFore .73s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps905-slide .ps905-head{animation:ps906SlideHead .71s ease both}.ps-chibi.ps905-slide .ps905-torso{animation:ps906SlideTorso .71s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps905-tag .ps905-torso{animation:ps906TagTorso .63s ease both}.ps-chibi.ps905-tag .ps905-fore.l{animation:ps906TagFore .63s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps905-tracking .ps905-torso{animation:ps906TrackTorso .66s ease both}
html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-chibi.ps906-transfer .ps905-arm.r{animation:ps906TransferArm .38s ease both}.ps-chibi.ps906-transfer .ps905-fore.r{animation:ps906TransferFore .38s ease both}.ps-chibi.ps906-transfer .ps905-torso{animation:ps906TransferTorso .38s ease both}

@keyframes ps906WindupShin{0%{transform:rotate(0)}62%{transform:rotate(72deg) translate(3px,-1px)}100%{transform:rotate(48deg) translate(2px,-1px)}}
@keyframes ps906HandBreakFore{0%{transform:rotate(0)}68%,100%{transform:rotate(39deg) translate(1px,-2px)}}
@keyframes ps906PitchShinFront{0%,14%{transform:rotate(46deg)}58%{transform:rotate(-26deg) translate(2px,2px)}100%{transform:rotate(-13deg)}}
@keyframes ps906PitchShinBack{0%{transform:rotate(0)}62%{transform:rotate(34deg)}100%{transform:rotate(54deg) translate(2px,1px)}}
@keyframes ps906PitchTorso{0%{transform:rotate(-3deg)}38%{transform:rotate(-12deg)}68%{transform:rotate(19deg) translate(2px,2px)}100%{transform:rotate(12deg) translate(1px,3px)}}
@keyframes ps906SwingFore{0%,18%{transform:rotate(0)}48%{transform:rotate(-18deg)}72%{transform:rotate(36deg)}100%{transform:rotate(49deg)}}
@keyframes ps906SwingFrontShin{0%{transform:rotate(0)}44%{transform:rotate(-8deg)}100%{transform:rotate(7deg)}}@keyframes ps906SwingBackShin{0%{transform:rotate(0)}48%{transform:rotate(11deg)}100%{transform:rotate(-8deg)}}
@keyframes ps906RunShin{from{transform:rotate(-36deg)}to{transform:rotate(45deg)}}@keyframes ps906RunTorso{from{transform:rotate(-4deg) translateY(1px)}to{transform:rotate(4deg) translateY(-1px)}}
@keyframes ps906CatchFore{0%{transform:rotate(0)}56%{transform:rotate(-34deg) translate(-1px,-3px)}76%{transform:rotate(-22deg) translate(-1px,-5px)}100%{transform:rotate(-12deg)}}@keyframes ps906CatchTorso{0%{transform:rotate(0)}50%{transform:rotate(-5deg) translateY(2px)}78%{transform:rotate(3deg) translateY(1px)}100%{transform:rotate(0)}}
@keyframes ps906FieldShin{0%{transform:rotate(0)}52%{transform:rotate(22deg)}72%{transform:rotate(29deg)}100%{transform:rotate(5deg)}}@keyframes ps906FieldTorso{0%{transform:rotate(0)}48%{transform:rotate(4deg) translateY(7px) scaleY(.92)}72%{transform:rotate(-2deg) translateY(9px) scaleY(.9)}100%{transform:rotate(0) translateY(2px)}}
@keyframes ps906TurnTorso{0%{transform:rotate(-4deg)}32%{transform:rotate(-14deg)}62%{transform:rotate(18deg)}100%{transform:rotate(7deg)}}@keyframes ps906TurnFore{0%{transform:rotate(-15deg)}48%{transform:rotate(-70deg)}72%{transform:rotate(45deg)}100%{transform:rotate(24deg)}}
@keyframes ps906CatcherTorso{0%{transform:translateY(3px)}31%{transform:translateY(-3px) rotate(-5deg)}62%{transform:rotate(-13deg)}82%{transform:rotate(17deg)}100%{transform:rotate(7deg)}}@keyframes ps906CatcherFore{0%,33%{transform:rotate(0)}58%{transform:rotate(-48deg)}78%{transform:rotate(62deg)}100%{transform:rotate(35deg)}}
@keyframes ps906SlideHead{0%{transform:rotate(0)}50%{transform:rotate(6deg)}100%{transform:rotate(13deg) translateY(2px)}}@keyframes ps906SlideTorso{0%{transform:rotate(0)}54%{transform:rotate(-9deg)}100%{transform:rotate(-17deg)}}
@keyframes ps906TagTorso{0%{transform:rotate(0)}50%{transform:rotate(9deg) translateY(4px)}78%{transform:rotate(14deg) translateY(6px)}100%{transform:rotate(4deg)}}@keyframes ps906TagFore{0%{transform:rotate(0)}55%{transform:rotate(38deg)}78%{transform:rotate(58deg)}100%{transform:rotate(18deg)}}
@keyframes ps906TrackTorso{0%{transform:rotate(0)}48%{transform:rotate(-5deg)}76%{transform:rotate(6deg)}100%{transform:rotate(1deg)}}
@keyframes ps906TransferArm{0%{transform:rotate(-22deg)}42%{transform:rotate(36deg)}100%{transform:rotate(78deg)}}@keyframes ps906TransferFore{0%{transform:rotate(-12deg)}55%{transform:rotate(46deg)}100%{transform:rotate(74deg)}}@keyframes ps906TransferTorso{0%{transform:rotate(-4deg)}58%{transform:rotate(11deg)}100%{transform:rotate(7deg)}}

@media(max-width:980px){.ps906-board{width:212px;height:99px}.ps906-mark{width:35px;height:35px}.ps906-screen strong{font-size:17px}.ps906-screen span{font-size:12px}.ps906-light.l2,.ps906-light.r2{opacity:.56}}
@media(max-width:620px){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps-stage{height:455px!important}.ps906-board{width:154px!important;height:74px!important;top:20.2%!important;padding:5px}.ps906-mark{width:25px;height:25px;margin-bottom:2px;border-width:2px}.ps906-mark:before{width:13px;height:13px;border-width:2px}.ps906-screen strong{font-size:12px}.ps906-screen span{font-size:10px}.ps906-screen small{display:none}.ps906-light{transform:scale(.78);transform-origin:top center}.ps906-light.l2,.ps906-light.r2{display:none}.ps906-venue{font-size:7px}.ps906-bowl{top:24.5%;height:18%}.ps906-net{display:none}.ps906-box{opacity:.55}}
@media(prefers-reduced-motion:reduce){html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps905-rig,html[data-sport="mlb"] ${ROOT}.tso-mlb-concept-v906 .ps905-rig *{animation:none!important;transition:none!important}}
`;
 document.head.appendChild(style);
}

function sceneMarkup(root){
 const venue=esc(venueName(root).toUpperCase());
 return `<div class="ps906-broadcast" aria-hidden="true">
  <div class="ps906-haze"></div><div class="ps906-stars"></div><div class="ps906-skyline"></div>
  <div class="ps906-deck left"></div><div class="ps906-deck right"></div><div class="ps906-bowl left"></div><div class="ps906-bowl right"></div>
  <div class="ps906-light l1"></div><div class="ps906-light l2"></div><div class="ps906-light r2"></div><div class="ps906-light r1"></div>
  <div class="ps906-foulpole left"></div><div class="ps906-foulpole right"></div><div class="ps906-battereye"></div>
  <div class="ps906-board"><div class="ps906-screen"><div class="ps906-mark"></div><strong>THE SPORTS</strong><span>OUTPOST</span><small>LIVE GAMECAST</small></div></div><div class="ps906-board-post"></div>
  <div class="ps906-adrail"><i></i><i></i><i></i><i></i><i></i></div><div class="ps906-venue">${venue}</div>
  <div class="ps906-dugout left"></div><div class="ps906-dugout right"></div><div class="ps906-net"></div><div class="ps906-plate-dirt"></div><div class="ps906-box left"></div><div class="ps906-box right"></div>
 </div>`;
}

function ensureScene(root){
 const stage=root.querySelector('.ps-stage');if(!stage)return;
 let scene=stage.querySelector(':scope>.ps906-broadcast');
 if(!scene){stage.insertAdjacentHTML('afterbegin',sceneMarkup(root));scene=stage.querySelector(':scope>.ps906-broadcast');}
 const venue=scene?.querySelector('.ps906-venue');
 const name=venueName(root).toUpperCase();
 if(venue&&venue.textContent!==name)venue.textContent=name;
}

function pulse(el,cls,ms=480){
 if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const stamp=`${cls.replace(/[^a-z0-9]/gi,'')}`;
 const now=Date.now(),last=Number(el.dataset[stamp]||0);if(now-last<ms*.72)return;
 el.dataset[stamp]=String(now);el.classList.add(cls);setTimeout(()=>el.isConnected&&el.classList.remove(cls),ms);
}

function syncArticulation(root){
 const text=`${root.querySelector('.ps-play-banner')?.textContent||''} ${root.querySelector('.ps-callout')?.textContent||''}`.toLowerCase();
 const playId=root.querySelector('.ps-stage')?.dataset?.playId||text.slice(0,90);
 const ground=/ground(?:ed|er|s)?|force out|fielder'?s choice|double play/.test(text);
 const throwPlay=/throws? to|double play|force out|fielder'?s choice|caught stealing|pickoff|picked off/.test(text);
 if(ground&&throwPlay){
  const fielder=[...root.querySelectorAll('.ps-chibi.ps-catching,.ps-chibi.ps905-grounder')].find(el=>!el.classList.contains('ps-catcher'));
  if(fielder&&fielder.dataset.ps906Transfer!==playId){fielder.dataset.ps906Transfer=playId;setTimeout(()=>pulse(fielder,'ps906-transfer',420),500);}
 }
 root.querySelectorAll('.ps-chibi').forEach(el=>{
  const stage=root.querySelector('.ps-stage');if(!stage)return;
  const top=parseFloat(el.style.top||getComputedStyle(el).top)||0;
  if(Number.isFinite(top))el.style.setProperty('--ps906-y',String(top));
 });
}

function enhance(root){
 if(!root)return;
 root.classList.add('tso-mlb-concept-v906');
 root.dataset.approvedConcept='v906';
 ensureScene(root);
 syncArticulation(root);
}
function scan(){raf=0;if(document.documentElement.getAttribute('data-sport')!=='mlb')return;document.querySelectorAll(ROOT).forEach(enhance);}
function queue(){if(!raf)raf=requestAnimationFrame(scan);}

export function installMlbPlaystageConceptV906(){
 ensureStyles();
 if(installed){queue();return;}
 installed=true;
 observer=new MutationObserver(queue);
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-play-id','data-venue','style']});
 window.addEventListener('hashchange',queue);
 queue();
}
export const __MLB_PLAYSTAGE_CONCEPT_V906_TEST__={STYLE_ID,ROOT,sceneMarkup};
