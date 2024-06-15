chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'searchAttachments') {
        searchAttachments(request.keyword).then(results => {
            sendResponse({ results: results });
        });
        return true;  // Will respond asynchronously.
    } else if (request.action === 'downloadAttachment') {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                sendResponse({ url: null });
                return;
            }

            getAttachmentUrl(request.messageId, request.attachmentId, token).then(url => {
                sendResponse({ url: url });
            }).catch(error => {
                sendResponse({ url: null });
            });
        });
        return true;  // Will respond asynchronously.
    }
});

function searchAttachments(keyword) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }

            fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?q=has:attachment+${keyword}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (!data.messages) {
                    resolve([]);
                    return;
                }
                
                const messageIds = data.messages.map(msg => msg.id);
                const attachmentPromises = messageIds.slice(0, 5).map(id => getAttachmentDetails(id, token));
                Promise.all(attachmentPromises).then(results => {
                    resolve(results.flat());
                });
            })
            .catch(error => reject(error));
        });
    });
}

function getAttachmentDetails(messageId, token) {
    return fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (!data.payload || !data.payload.parts) {
                return [];
            }

            // Extract attachment filenames and URLs
            const attachments = data.payload.parts
                .filter(part => part.filename && part.body && part.body.attachmentId)
                .map(part => ({
                    filename: part.filename,
                    attachmentId: part.body.attachmentId,
                    messageId: messageId
                }));
            return attachments;
        });
}

function getAttachmentUrl(messageId, attachmentId, token) {
    return fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const base64Url = data.data.replace(/_/g, '/').replace(/-/g, '+');
            return `data:application/octet-stream;base64,${base64Url}`;
        });
}
