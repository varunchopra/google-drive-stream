# video-stream-api

video-stream-api is an app utilising Express.js and Nightmare.js to fetch videos from Google Drive and serve them over an Express web server.

## Configuration

* `cache` config:
  * `cookieLifetime`: time cookies are stored for.
  * `fileLifetime`: time each link is cached for.

* `security` config:
  * `token`: string passed to the server in the URL as a somewhat generic way of authentication.
  * `sites`: list of sites that can access the server without facing a redirect.

* `google` config:
  * `email`: your google drive e-mail address on which the files are stored.
  * `password`: your google drive password in plaintext.

* `database` config:
  * `name`: database name.
  * `username`: user who can access above database (INSERT/SELECT privs).
  * `password`: password of said user.
  * `host`: database host server.
  
### Example configuration

    const config = {
        cache: {
            cookieLifetime: 12000,
            fileLifetime: 12000
        },
        security: {
            token: "pzblervv",
            sites: ["moveetime.com", "moveetime.org"]
        },
        google: {
            email: "genericemail@gmail.com",
            password: "genericpassword123"
        },
        database: {
            name: "genericdatabase",
            username: "root",
            password: "password",
            host: "localhost"
        }
    };

    module.exports = config;

# License

GNU General Public License v3.0

See [LICENSE](LICENSE) to see the full text.
