const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.status(200).send("Hello from Firebase!");
});
function addMessageTyeToNofication(type) {
    switch (type) {
        case 'text':
            return 'Text Message';
        case 'photo':
            return 'Photo Message';
        case 'audio':
            return 'Voice Message';
        case 'video':
            return 'Video Message';
        case 'attachement':
            return 'File Attachment Message'
    }
}
exports.informOthers = functions.https.onRequest((request, response) => {
    //admin.database().ref('messages').push(request.query.key)
    admin.database().ref(`rooms/${request.query.activity_id}/${request.query.room_name}`).once('value', (snapshoot) => {
        let room = snapshoot.val()
        let message = request.query.message || "no caption added"
        let members = room.members
        members.map(element => {
             if (element.phone !== request.query.sender_phone) {
            admin.database().ref(`notifications_tokens/${element.phone}`).once('value', snap => {
                let token = snap.val()
                //console.log(token)
                let ref = admin.database().ref(`new_message/${element.phone}/${request.query.room_key}`)
                ref.once('value', snapValue => {
                    if (snapValue.val() === null) {
                        ref.set({ new_messages: [request.query.message_key] })
                    } else {
                        ref.set({ new_messages: [...snapValue.val().new_messages, request.query.message_key] });
                    }
                    if(token){
                        const payload = {
                            notification: {
                                title: "New " + addMessageTyeToNofication(request.query.message_type) + " from " +
                                    request.query.room_name + "@" +
                                    request.query.activity_name,
                                body: message,
                            },
                            data: {
                                "room_key": request.query.room_key,
                                "type": "new_message_activity",
                                "activity_id":request.query.activity_id
                            }
                        }
                        admin.messaging().sendToDevice(token, payload).then((status) => {
                            console.log(status)
                            return true
                        }).catch(error => {
                            console.log(error)
                        })
                    }
                })
            })
            return "ok"
            }
        })
    })
    return response.status(200).send("okooo")
})
