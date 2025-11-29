
Spry.Utils.addLoadListener(function() {
	var onloadCallback = function(e){ loadProfile() }; // body
	Spry.$$("body").addEventListener('load', onloadCallback, false).forEach(function(n){ onloadCallback.call(n); });
	Spry.$$("#div1").addEventListener('click', function(e){ document.getElementById('avatarInput').click() }, false);
	Spry.$$("#div2").addEventListener('click', function(e){ updateDisplayName() }, false);
	Spry.$$("#a1").addEventListener('click', function(e){ logoutUser() }, false);
});
