var FatBar = {
	loadFromVideoId: function(videoId) {
		FatBar._loadVideoInfo(videoId);
		FatBar._loadRelatedInfo(videoId);
	},
	_loadRelatedInfo: function(videoId) {
		$('#related').html('').show();
		var url = "http://gdata.youtube.com/feeds/api/videos/" + videoId + "/related?callback=?";
		var params = {
			'alt': 'json-in-script',
			'max-results': 10,
			'prettyprint': true,
			'v': 2
		};
		$.getJSON(url, params, function(data) {
			$.each(data.feed.entry, function(i, item) {
				var url = item['id']['$t'];
				var videoId = url.match('video:(.*)$')[1];
				var title = item['title']['$t'];
				if (item['gd$rating'])
					var rating = item['gd$rating']['average'];
				var resultItem = createResultsItem(title, videoId, rating);
				resultItem.appendTo($('#related'));
			}); 
		});
	},
	_loadVideoInfo: function(videoId) {
		$('#video-info-box .uploader').text('');
		var url = "http://gdata.youtube.com/feeds/api/videos/" + videoId + "?callback=?";
		var params = {
			'alt': 'json-in-script',
			'prettyprint': true,
			'v': 2
		};
		$.getJSON(url, params, function(data) {
            console.log(data);
			var author = data.entry.author[0].name.$t;
			var uri = data.entry.author[0].uri.$t;
			$('#video-info-box .uploader')
				.click(function() {
					Uploader.loadVideosFromURI(uri);
				})
				.text(author);
		});
	}
};