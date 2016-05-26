### v1.2.7

- Modified console.logs to use debug instead. Now debugging can be enabled with `DEBUG=node-image-farmer* npm run app`

### v1.2.6

- Modified the run script to include the imageFarmer process name. Now `sudo killall imageFarmer` will work.

### v1.2.5

- Added CHANGELOG.md and adjusted the README.md file.
- Modified nodeImageFarmer.sh to log to /var/log/node-image-farmer and nohup the process.

### v1.2.4

- Set nodeImageFarmer.sh to executable

### v1.2.3

- Added nodeImageFarmer.sh so that the app can be found more easily in `ps -A | grep nodeImageFarmer`

### v1.2.2

- Changed README.md based on fixes from v1.2.1

### v1.2.1

- Fixed the prefix setting so the temp files are written to the correct folder.

### v1.2.0

- Moved the appConfig into a JSON file. Bumped the minor version because it's a semi-breaking change.

### v1.1.0

- Massive refactor of connect-thumbs to use promises, multiple processes, and API changes. 
- Decided to bump the major version to prevent conflicts with older versions of the code. 
