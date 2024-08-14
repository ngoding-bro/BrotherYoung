const { google } = require('googleapis');
const { iclik, ngiclik } = require('./nubi');
const { getUser } = require('../db');
var client_id, client_secret, refresh_token, uri, folderName, emailAddress, description
getUser(async (err, data) => {
    if (err) {
        console.error('Error:', err.message);
        return;
    }
    client_id = ngiclik(data.client_id), client_secret = ngiclik(data.client_secret), refresh_token = ngiclik(data.refresh_token), uri = ngiclik(data.uri)
});
const OAuth2 = google.auth.OAuth2;
const oAuth2Client = new OAuth2(client_id, client_secret, uri);
oAuth2Client.setCredentials({ refresh_token: refresh_token, access_token: 'ya29.a0AXooCguFNhofD4NbcXkSR7eWFmHWcNhuJwzF0x2dITevhJTH_Bi3Piy_YrDaFL3pXkwCDkxtdCclem7C3r_KXmhPNo0s4gRaeC45eX2HT2WdxQeC1vKOEvUjMAqI8T3nw3EVrDRDs4JulRjsVR-4h5M6rOr1oIZLkHcNaCgYKAfgSARESFQHGX2Mic2bxkqWY_iuPkkHTq8xKGQ0171'});
const drive = google.drive({
    version: 'v3',
    auth: oAuth2Client
});
const userGdrive = async (client_id, client_secret, refresh_token, uri, folderName, emailAddress, description, parentFolderId = 'root') => {
    const createAndShareFolder = async (folderName, emailAddress, parentFolderId) => {
        const fileMetadata = {
            'name': folderName,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parentFolderId]
        };
        try {
            const file = await drive.files.create({
                resource: fileMetadata,
                fields: 'id'
            });
            console.log('Folder Id:', file.data.id);
            const folderId = file.data.id;

            const permissions = [
                {
                    'type': 'user',
                    'role': 'viewer',
                    'emailAddress': emailAddress
                }
            ];
            drive.permissions.create({
                resource: permissions[0],
                fileId: folderId,
                fields: 'id',
                sendNotificationEmail: true,
                emailMessage: description
            });
            console.log(`Folder shared with ${emailAddress}`);
        } catch (error) {
            console.error('Error creating or sharing folder:', error);
            throw error;
        }
    };
    try {
        await createAndShareFolder(folderName, emailAddress, parentFolderId);
    } catch (error) {
        console.error('Error in userGdrive function:', error);
    }
};
async function listStoreFolders() {
    try {
        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and name='Store' and trashed=false",
            fields: 'files(id, name)',
        });

        const folders = response.data.files;
        if (folders.length === 0) {
            return 'No folders named "Store" found.';
        } else {
            let result = 'Folders named "Store":\n';
            folders.forEach((folder) => {
                result += `- ${folder.name} (ID: ${folder.id})\n`
            });
            return result;
        }
    } catch (error) {
        console.error('Error retrieving folders:', error.message);
    }
}
module.exports = {listStoreFolders}