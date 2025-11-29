
Spry.Utils.addLoadListener(function() {
	Spry.$$("#button1").addEventListener('click', function(e){ signUpUser() }, false);
	Spry.$$("#a1").addEventListener('click', function(e){ document.getElementById('loginBox').style.display='block'; window.scrollTo(0,0); }, false);
	Spry.$$("#button2").addEventListener('click', function(e){ loginUser() }, false);
});
