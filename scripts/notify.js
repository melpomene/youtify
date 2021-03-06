function notification_Init() {
	$('#notification').click( Notification.hide );
}

var Notification = {
	show: function(message) {
		$('#notification span').text(message);
		
		if (!$('#notification').is(':visible'))
			$('#notification').slideDown();	
	},
	hide: function() {
		if ($('#notification').is(':visible'))
			$('#notification').slideUp('normal');
	},
	announce: function(message) {
		if (window.webkitNotifications) {
			if (window.webkitNotifications.checkPermission() === 1) { // 0=OK, 1=Not Allowed, 2=Denied
				window.webkitNotifications.requestPermission(function() { 
					Notification._announce(message); 
				});
			} else { 
				Notification._announce(message); 
			}
		}
	},
	_announce: function(message) {
		try
		{
			var settings = new Settings();
			var popup = window.webkitNotifications.createNotification(
				'/images/logo32x32.png',
				'Youtify',
				message);
			popup.show();
			setTimeout(function(){ popup.cancel(); }, settings.announceTimeout);
		} catch(err) {
			console.log(err.message);
		}
	},
	error: function(message) {
		try {
			Player.pause();
		} catch (err) { }
		$('#loading span').text(message);
		$('#loading').css('backgroundImage', 'url(/images/null.png)').show();
	}
};

var Publishers = [
	{
        uploaderRegEx: '(^[\w]+[VEVO])',
        twitter: '@vevo',
        name: 'VEVO'
    }
];
