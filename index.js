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
    admin.database().ref(`rooms/${request.query.activity_id}/${request.query.room_key}`).once('value', (snapshoot) => {
        let room = snapshoot.val()
        if (room !== null) {
            let message = request.query.message || "no caption added"
            let members = room.members
            members.map(element => {
                let phone = request.query.sender_phone.replace(" ", "+")
                let memberPhone = element.phone.replace("00", "+")
                //admin.database().ref(`activity/${request.query.activity_id}/participants`).once('value', mem => {
                //if (mem.val().findIndex(ele => ele.phone.replace("00", "+") === memberPhone) >= 0) {
                if (memberPhone !== phone) {
                    admin.database().ref(`current_room/${memberPhone}`).once('value', snapshoot => {
                        let current_room = snapshoot.val()
                        if (current_room !== request.query.room_key) {
                            admin.database().ref(`notifications_tokens/${memberPhone}`).once('value', snap => {
                                let token = snap.val()
                                let ref = admin.database().ref(`new_message/${request.query.activity_id}/${memberPhone}/${request.query.room_key}`)
                                ref.once('value', snapValue => {
                                    if (snapValue.val() === null) {
                                        ref.set({ new_messages: [request.query.message_key] })
                                    } else {
                                        ref.set({ new_messages: [...snapValue.val().new_messages, request.query.message_key] });
                                    }
                                    if (token) {
                                        const payload = {
                                            notification: {
                                                title: "New " + addMessageTyeToNofication(request.query.message_type) + " from " +
                                                    request.query.room_name + "@" +
                                                    request.query.activity_name,
                                                body: message,
                                            },
                                            data: {
                                                "room_key": request.query.room_key,
                                                "type": request.query.room_type === "relation" ? "new_relation_message" : "new_message_activity",
                                                "activity_id": request.query.activity_id
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
                }
                // }
                //  })
            })
        }
    })
    return response.status(200).send("okooo")
})

exports.addParticipant = functions.https.onRequest((request, response) => {
    let member = JSON.parse(request.query.members)
    let event_id = request.query.event_id
    admin.database().ref(`activity/${event_id}/participants`).once('value', snap => {
        let newMembers = snap.val() !== null ? snap.val().concat(member) : member
        admin.database().ref(`activity/${event_id}/participants`).set(newMembers)
        add(event_id, event_id, member)
    })
    return response.status(200).send("okooo")
})

exports.addMembers = functions.https.onRequest((request, response) => {
    let member = JSON.parse(request.query.members)
    let event_id = request.query.event_id
    let committee_id = request.query.committee_id
    add(event_id, committee_id, member)
    return response.status(200).send("okooo")
})

function add(event_id, committee, member) {
    let ref = `rooms/${event_id}/${committee}/members`
    admin.database().ref(ref).once('value', snap => {
        let newMembers = snap.val() !== null ? snap.val().concat(member) : member
        admin.database().ref(ref).set(newMembers)
    })
}

exports.removeParticipant = functions.https.onRequest((request, response) => {
    let member = JSON.parse(request.query.members)
    let event_id = request.query.event_id
    admin.database().ref(`activity/${event_id}/participants`).once('value', snap => {
        let newMembers = snap.val() !== null ? snap.val().filter(ele => !member.find(e => ele.phone === e.phone)) : []
        admin.database().ref(`activity/${event_id}/participants`).set(newMembers)
        remove(event_id, event_id, member)
    })
    return response.status(200).send("okooo")
})
exports.removeMembers = functions.https.onRequest((request, response) => {
    let member = JSON.parse(request.query.members)
    let event_id = request.query.event_id
    let committee = request.query.committee_id
    remove(event_id, committee, member)
    return response.status(200).send("okooo")
})

function remove(event_id, committee, member) {
    let ref = `rooms/${event_id}/${committee}/members`
    admin.database().ref(ref).once('value', snap => {
        let newMembers = snap.val() !== null ? snap.val().filter(ele => !member.find(e => ele.phone === e.phone)) : []
        admin.database().ref(ref).set(newMembers)
    })
}