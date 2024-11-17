This folder contains my userscripts for doing things on a danbooru instance.

They are *mostly* aimed at making copying tag and wiki data from an "upstream" danbooru instance (in this specific case, the official danbooru servers) to a personal one easier.

Browser support is "whatever I'm currently using" - no long-term support is guaranteed for anything.

`common.js` contains some common functionality that both scripts need.

If you want to use these scripts, observe the following notes:

* `donmai.user.js` by default runs on the danbooru domain. This should be fine for most usecases.
* `own-server.user.js` by default runs on *no* domains. You need to go into your userscript manager's settings ([Greasemonkey](https://wiki.greasespot.net/Greasemonkey_Manual:Monkey_Menu), I haven't tested with other managers) and *manually* add a grant for your domain. Then reload the page.
