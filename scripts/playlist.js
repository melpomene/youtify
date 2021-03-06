/** EVENTS
 ****************************************************************************/

function deleteVideoButtonClicked(li) {
    var playlist = $('#playlistbar').data('playlist');

    playlist.deleteVideo(li.index());
    playlistManager.save();

    loadPlaylistView(playlist);
}

function playlistMouseDown(event) {
	$('#left-menu li').removeClass('selected');
	$(this).addClass('selected');
}

function loadPlaylist(playlistId) {
    $.ajax({
        url: '/api/playlists/' + playlistId,
        type: 'GET',
        statusCode: {
            200: function(data) {
                var playlist = new Playlist(data.title, data.videos, data.remoteId, data.owner, data.isPrivate);
                loadPlaylistView(playlist);
            },
            404: function(data) {
                alert("No such playlist found");
            }
        }
    });
}

function savePlaylistButtonClicked(event) {
    var playlistBar = $(this).parent();
    var playlist = playlistBar.data('playlist');
    playlistManager.addPlaylist(playlist.copy()); // create copy without connection to remote
    playlistBar.replaceWith(createPlaylistBar(playlist));
    constructPlaylistsMenu();
}

function syncPlaylistButtonClicked(event) {
    var playlistBar = $(this).parent();
    var playlist = playlistBar.data('playlist');
    playlist.sync(function() {
        playlistBar.replaceWith(createPlaylistBar(playlist));
        history.pushState(null, null, playlist.getUrl());
        constructPlaylistsMenu();
    });
}

function shareButtonClicked(event) {
    var playlistBar = $(this).parent();
    var playlist = playlistBar.data('playlist');
    $('#share-playlist-popup .link input').val(playlist.getUrl());

    $('#share-playlist-popup .twitter').attr('href', playlist.getTwitterShareUrl())
        .unbind('click')
        .click(function(event) {
            event.preventDefault();
            window.open($(this).attr('href'), 'Share playlist on Twitter', 400, 400);
            return false;
        });

    $('#share-playlist-popup .facebook').attr('href', playlist.getFacebookShareUrl())
        .unbind('click')
        .click(function(event) {
            event.preventDefault();
            window.open($(this).attr('href'), 'Share playlist on Facebook', 400, 400);
            return false;
        });

    $(this).arrowPopup('#share-playlist-popup');
}

function createPlaylistBar(playlist) {
    var div = $('<div id="playlistbar"></div>').data('playlist', playlist);

    $('<span class="title"/>').text(playlist.title).appendTo(div);

    if (playlist.owner) {
        if (playlist.owner.id != my_user_id) {
            var owner = $('<span class="owner"></span>').text('by: ');
            $('<span class="name"></span>').text(playlist.owner.name).appendTo(owner);
            owner.appendTo(div);

            // Add save button if not already saved
            if (!(playlist.remoteId in playlistManager.getPlaylistsMap())) {
                $('<input type="button" class="save"></button>')
                    .val('Copy playlist')
                    .click(savePlaylistButtonClicked)
                    .appendTo(div);
            }
        }
        $('<span class="expand-button share translatable">Share</span>').click(shareButtonClicked).appendTo(div);
    } else if (logged_in) {
        $('<input type="button" class="sync"></button>')
            .val('Sync')
            .click(syncPlaylistButtonClicked)
            .appendTo(div);
    }

    return div;
}

function loadPlaylistView(playlist) {
	$('#results-container ol').hide();
    $('#playlistbar').replaceWith(createPlaylistBar(playlist)).show();
    $('#playlist').html('');

    $.each(playlist.videos, function(i, item) {
        var li = createResultsItem(item.title, item.videoId);
        li.data('additionalMenuButtons').push({
            title: 'Delete',
            li: li,
            callback: deleteVideoButtonClicked
        });
        li.addClass('droppable');
        li.addClass('draggable');
        li.addClass('reorderable');
        li.appendTo('#playlist');
    });

	$('#playlist').show();
}

/**
 * Mark the playlistElem in the #left-menu as selected, then
 * fill #playlist with the contained videos.
 */
function playlistClicked(event) {
    var playlist = $(this).data('model');

    if (playlist.remoteId) {
        history.pushState(null, null, playlist.getUrl());
    } else {
        history.pushState(null, null, '/');
    }

	$('#playlist').data('owner', $(this));

    loadPlaylistView(playlist);
}

function shuffleButtonClicked(event) {
    if ($(this).hasClass('shuffle-on')) {
        setShuffle(false, $(this).parent());
        Player.addSiblingsToPlayorder($('#results-container li.playing, #results-container li.paused'), false);
    } else {
        setShuffle(true, $(this).parent());
        Player.addSiblingsToPlayorder($('#results-container li.playing, #results-container li.paused'), true);
    }
    event.stopPropagation();
}

/** MISC
 ****************************************************************************/

function setShuffle(enabled, playlistElem) {
	var playlist = playlistElem.data('model');
	playlist.shuffle = enabled;
	playlistManager.save();
	if (enabled) {
		$(playlistElem).find('.shuffle-off').addClass('shuffle-on');
		$(playlistElem).find('.shuffle-off').removeClass('shuffle-off');
	} else {
		$(playlistElem).find('.shuffle-on').addClass('shuffle-off');
		$(playlistElem).find('.shuffle-on').removeClass('shuffle-on');
	}
}

/** CLASS PLAYLIST
 ****************************************************************************/

function Playlist(title, videos, remoteId, owner, isPrivate, shuffle) {
    this.title = title;
    this.videos = videos;
    this.remoteId = remoteId || null;
    this.isPrivate = isPrivate || false;
    this.shuffle = shuffle;
    this.owner = owner;
    this.synced = true; // not part of JSON structure
    this.syncing = false; // not part of JSON structure

    this.getTwitterShareUrl = function() {
        var url = this.getUrl(),
            text = "Check out this playlist!" + ' -- ' + this.title;
        return encodeURI('http://twitter.com/share?related=youtify&via=youtify' + '&url=' + url + '&counturl=' + url + '&text=' + text);
    };

    this.getFacebookShareUrl = function() {
        var url = this.getUrl();
        return 'http://facebook.com/sharer.php?u=' + url;
    };

    this.getUrl = function() {
        return location.protocol + '//' + location.host + '/users/' + this.owner.id + '/playlists/' + this.remoteId;
    };

    this.copy = function() {
        return new Playlist(this.title, this.videos);
    };

    this.rename = function(newTitle) {
        var title = $.trim(newTitle);
        if (title.length > 0 && title.length < 50) {
            this.title = newTitle;
        }
        this.synced = false;
    };

    this.unsync = function(callback) {
        $.ajax({
            type: 'DELETE',
            url: '/api/playlists/' + this.remoteId + '?device=' + device,
			data: { 
				'device': device 
			},
			statusCode: {
				200: function(data) {
					if (callback) {
						callback();
					}
				},
				404: function(data) {
					Notification.warn(translations['No such playlist found']);
				},
				409: function(data) {
					Notification.error(translations['Your account has been used somewhere else. Please reload the page.']);
				}
			}
        });

        this.remoteId = null;
        this.owner = null;
    };

    this.createNewPlaylistOnRemote = function(callback) {
        var self = this,
            params = {
                'json': JSON.stringify(this.toJSON()),
				'device': device
            };

        this.syncing = true;

		$.ajax({
            type: 'POST',
            url: '/api/playlists',
			data: params,
			statusCode: {
				200: function(data, textStatus) {
					self.syncing = false;
					if (textStatus === 'success') {
						self.remoteId = data.remoteId;
						self.owner = data.owner;
						self.synced = true;
					 } else {
						alert('Failed to create new playlist ' + self.title);
					}
					if (callback) {
						callback();
					}
				},
				409: function(data) {
					Notification.error(translations['Your account has been used somewhere else. Please reload the page.']);
				}
			}
        });
    };

    this.updatePlaylistOnRemote = function(callback) {
        var self = this,
            params = {
                'json': JSON.stringify(this.toJSON()),
				'device': device
            };

        this.syncing = true;

		$.ajax({
            type: 'POST',
            url: '/api/playlists/' + this.remoteId,
			data: params,
			statusCode: {
				200: function(data, textStatus) {
					self.syncing = false;
					if (textStatus === 'success') {
						self.synced = true;
					} else {
						alert('Failed to create new playlist ' + self.title);
					}
					if (callback) {
						callback();
					}
				},
				404: function(data) {
					Notification.warn(translations['No such playlist found']);
				},
				409: function(data) {
					Notification.error(translations['Your account has been used somewhere else. Please reload the page.']);
				}
			}
        });
    };

    this.sync = function(callback) {
        if (this.remoteId && this.synced) {
            callback();
        } else if (this.remoteId) {
            this.updatePlaylistOnRemote(callback);
        } else {
            this.createNewPlaylistOnRemote(callback);
        }
    };

    this.addVideo = function(title, videoId) {
        if (this.syncing) {
            alert("Please wait until the playlist is synced");
            return;
        }

        if (typeof title !== 'string') {
            throw "title param must be string";
        }
        if (typeof videoId !== 'string') {
            throw "videoId param must be string";
        }

        this.videos.push({
            videoId: videoId,
            title: title,
        });

        this.synced = false;
    };

    this.moveVideo = function(sourceIndex, destIndex) {
        if (this.syncing) {
            alert("Please wait until the playlist is synced");
            return;
        }

        var tmp;

        if (destIndex > sourceIndex) {
            destIndex -= 1;
        }

        tmp = this.videos.splice(sourceIndex, 1)[0];
        this.videos.splice(destIndex, 0, tmp);

        this.synced = false;
    };

    this.deleteVideo = function(index) {
        if (this.syncing) {
            alert("Please wait until the playlist is synced");
            return;
        }

        this.videos.splice(index, 1);
        this.synced = false;
    };

    this.toJSON = function() {
        return {
            title: this.title,
            videos: this.videos,
            remoteId: this.remoteId,
            owner: this.owner,
            isPrivate: this.isPrivate,
			shuffle: this.shuffle
        };
    };

    this.createListElem = function() {
        var li = $('<li/>')
            .addClass("playlistElem")
            .addClass('droppable')
            .data('model', this)
            .bind('contextmenu', showPlaylistContextMenu)
            .mousedown(playlistMouseDown)
            .click(playlistClicked);

        $('<span class="title"></span>').text(this.title).appendTo(li);

        if (this.remoteId) {
            li.addClass('remote');
        } else {
            li.addClass('local')
        }

        if (this.isPrivate) {
            li.addClass('private');
        }

        var shuffleButton = $('<button/>').click(shuffleButtonClicked);

        if (this.shuffle) {
            shuffleButton.addClass('shuffle-on');
        } else {
            shuffleButton.addClass('shuffle-off');
        }

        shuffleButton.appendTo(li);
        
        return li;
    };
	
	this.removeDuplicates = function() {
		var deleted = 0;
		for (var i = this.videos.length-1; i > 0; i--) {
			for (var j = i-1; j >= 0; j--) {
				if (this.videos[i].videoId === this.videos[j].videoId) {
					this.deleteVideo(j);
					deleted++;
					break;
				}
			}
		}
		playlistManager.save();
		loadPlaylistView(this);
		return deleted;
	};
};
