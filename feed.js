
Spry.Utils.addLoadListener(function() {
	var onloadCallback = function(e){ loadFeed() }; // body
	Spry.$$("body").addEventListener('load', onloadCallback, false).forEach(function(n){ onloadCallback.call(n); });
});
