
Spry.Utils.addLoadListener(function() {
	var onloadCallback = function(e){ loadThread() }; // body
	Spry.$$("body").addEventListener('load', onloadCallback, false).forEach(function(n){ onloadCallback.call(n); });
	Spry.$$("#button1").addEventListener('click', function(e){ createReply() }, false);
});
