'use strict';
const WHU_BOARDS={
 verdant:{title:'The Verdant Maw',image:'assets/board.jpg',starts:['1:480','1:1248','3:480','3:1248','3:1440','4:192','4:576','6:384','6:1152','7:1248','8:768','8:960','9:480','9:1248'],waystones:['2:576','2:1344','8:384','8:1152'],stagger:['5:864'],blocked:[]},
 whispering:{title:'Whispering Root-Hollow',image:'assets/whispering_root_hollow.jpg',starts:['1:480','2:576','4:384','7:480','9:480','6:576','8:768','2:960','4:1152','8:1152','1:1248','3:1248','9:1248','6:1344'],waystones:['8:576','2:1152'],stagger:['3:480','7:1248'],blocked:[]},
 blazing:{title:'The Blazing Bastion',image:'assets/the_blazing_bastion.jpg',starts:['1:480','2:384','4:384','7:288','7:480','9:480','8:768','4:960','1:1056','3:1248','2:1344','6:1536','7:1248','9:1248'],waystones:[],stagger:['3:480','9:1056'],blocked:['6:576','4:1152']},
 haven:{title:'Haven of the Hated',image:'assets/haven_of_the_hated.jpg',starts:['3:288','2:384','7:480','9:480','10:384','4:576','1:672','8:960','3:1056','6:1152','1:1248','2:1344','8:1344','7:1440'],waystones:[],stagger:['4:384','6:1344'],blocked:[]}
};
function currentBoard(){return WHU_BOARDS[state.territories?.board]||WHU_BOARDS.verdant;}
function applySelectedBoard(){const b=currentBoard(),image=document.querySelector('#boardStage>img');if(image.getAttribute('src')!==b.image)image.src=b.image;image.alt='Herní deska '+b.title;$('boardTitle').textContent=b.title;const preview=$('territoryPreviewImage');if(preview.getAttribute('src')!==b.image)preview.src=b.image;preview.alt=b.title;}
