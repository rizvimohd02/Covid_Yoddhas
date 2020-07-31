const Cloudant = require('@cloudant/cloudant');

const cloudant_id = process.env.CLOUDANT_ID || '<cloudant_id>'
const cloudant_apikey = process.env.CLOUDANT_IAM_APIKEY || '<cloudant_apikey>';

// UUID creation
const uuidv4 = require('uuid/v4');

var cloudant = new Cloudant({
    account: cloudant_id,
    plugins: {
      iamauth: {
        iamApiKey: cloudant_apikey
      }
    }
  })

// Cloudant DB reference
let db;
let db_name = "bookings_db";

/**
 * Connects to the Cloudant DB, creating it if does not already exist
 * @return {Promise} - when resolved, contains the db, ready to go
 */
const dbCloudantConnect = () => {
    return new Promise((resolve, reject) => {
        Cloudant({  // eslint-disable-line
            account: cloudant_id,
                plugins: {
                    iamauth: {
                        iamApiKey: cloudant_apikey
                    }
                }
        }, ((err, cloudant) => {
            if (err) {
                console.log('Connect failure: ' + err.message + ' for Cloudant ID: ' +
                    cloudant_id);
                reject(err);
            } else {
                cloudant.db.list().then((body) => {
                    if (!body.includes(db_name)) {
                        console.log('DB Does not exist..creating: ' + db_name);
                        cloudant.db.create(db_name).then(() => {
                            if (err) {
                                console.log('DB Create failure: ' + err.message + ' for Cloudant ID: ' +
                                cloudant_id);
                                reject(err);
                            }
                        })
                    }
                    let db = cloudant.use(db_name);
                    console.log('Connect success! Connected to DB: ' + db_name);
                    resolve(db);
                }).catch((err) => { console.log(err); reject(err); });
            }
        }));
    });
}

// Initialize the DB when this module is loaded
(function getDbConnection() {
    console.log('Initializing Cloudant connection...', 'getDbConnection()');
    dbCloudantConnect().then((database) => {
        console.log('Cloudant connection initialized.', 'getDbConnection()');
        db = database;
    }).catch((err) => {
        console.log('Error while initializing DB: ' + err.message, 'getDbConnection()');
        throw err;
    });
})();

/**
 * Find all resources that match the specified partial name.
 * 
 * @param {String} place
 * @param {String} partialName
 * @param {String} userID
 * 
 * @return {Promise} Promise - 
 *  resolve(): all resource objects that contain the partial
 *          name, place or userID provided, or an empty array if nothing
 *          could be located that matches. 
 *  reject(): the err object from the underlying data store
 */
function find(place, partialName, userID, trnsctype, isBookingMand) {
    return new Promise((resolve, reject) => {
        let selector = {}
        
            if (place) {

                selector['place'] = place;
            }
            if (partialName) {
                let search = `(?i).*${partialName}.*`;
                selector['name'] = {'$regex': search};
    
            }
            if (userID ) {
                selector['userID'] = userID;
            }        

         if (trnsctype) {
        selector['trnsctype'] = trnsctype;
         }

         if (isBookingMand) {
            selector['isBookingMand'] = isBookingMand;
             }
        
        
        db.find({ 
            'selector': selector
        }, (err, documents) => {
            if (err) {
                reject(err);
            } else {
                resolve({ data: JSON.stringify(documents.docs), statusCode: 200});
            }
        });
    });
}


/**
 * Delete a resource that matches a ID.
 * 
 * @param {String} id
 * 
 * @return {Promise} Promise - 
 *  resolve(): Status code as to whether to the object was deleted
 *  reject(): the err object from the underlying data store
 */
function deleteById(id, rev) {
    return new Promise((resolve, reject) => {
        db.get(id, (err, document) => {
            if (err) {
                resolve(err.statusCode);
            } else {
                db.destroy(id, document._rev, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(200);
                    }
                })
            }            
        })
    });
}

/**
 * Create Booking with the specified attributes
 * 
 * @param {String} place - the place of the item
 * @param {String} name - the name of the item
 * @param {String} emailid - the emailid of the item
 * @param {String} person - the person available 
 * @param {String} contact - the contact info 
 * @param {String} userID - the ID of the user 
 * @param {String} datetime - the date of booking
 * @param {String} bookingtime - the timeslot of booking
 * @param {String} trnsctype - Transaction type which is hard coded as 'customerBooking' for bookings
 * @return {Promise} - promise that will be resolved (or rejected)
 * when the call to the DB completes
 */
function create(place, name, emailid, person, contact, userID, datetime, bookingtime, trnsctype) {
    return new Promise((resolve, reject) => {
        let itemId = uuidv4();
        let whenCreated = Date.now();
        let item = {
            _id: itemId,
            id: itemId,
            place: place,
            name: name,
            emailid: emailid,
            person: person,
            contact: contact,
            userID: userID,
            datetime: datetime,
            bookingtime: bookingtime,
            trnsctype: trnsctype,
            whenCreated: whenCreated
        };
        db.insert(item, (err, result) => {
            if (err) {
                console.log('Error occurred: ' + err.message, 'create()');
                reject(err);
            } else {
                resolve({ data: { createdId: result.id, createdRevId: result.rev }, statusCode: 201 });
            }
        });
    });
}

/**
 * Create a Business Entry with the specified attributes
 * 
 * @param {String} businessname - the place of the item
 * @param {String} openingtime - the name of the item
 * @param {String} closingtime - the emailid of the item
 * @param {String} personallowed - the person available
 * @param {String} isBookingMand - whether the booking is mandatory or not before the visit
 * @param {String} location - the GPS location
 * @param {String} userID - the ID of the user 
 * @param {String} trnsctype - Transaction type which is hard coded as 'BusinessRegistration' for bookings
 * @return {Promise} - promise that will be resolved (or rejected)
 * when the call to the DB completes
 */
function createB(businessname, openingtime, closingtime, personallowed, isBookingMand, location, trnsctype, userID) {
    return new Promise((resolve, reject) => {
        let itemId = uuidv4();
        let whenCreated = Date.now();
        let item = {
            _id: itemId,
            id: itemId,
            businessname: businessname,
            openingtime: openingtime,
            closingtime: closingtime,
            personallowed: personallowed,
            isBookingMand: isBookingMand,
            location: location,
            trnsctype: trnsctype,
            userID: userID,
            whenCreated: whenCreated
        };
        db.insert(item, (err, result) => {
            if (err) {
                console.log('Error occurred: ' + err.message, 'create()');
                reject(err);
            } else {
                resolve({ data: { createdId: result.id, createdRevId: result.rev }, statusCode: 201 });
            }
        });
    });
}

/**
 * Create a Staff Entry with the specified attributes
 * 
 * @param {String} staffName - the place of the item
 * @param {String} staffEmailid - the name of the item
 * @param {String} staffContact - the emailid of the item
 * @param {String} staffDepartment - the person available
 * @param {String} userID - the ID of the user
 * @param {String} trnsctype - Transaction type which is hard coded as 'StaffDetails' for bookings
 * @return {Promise} - promise that will be resolved (or rejected)
 * when the call to the DB completes
 */
function createStaff(staffName, staffEmailid, staffContact, staffDepartment, trnsctype, userID) {
    return new Promise((resolve, reject) => {
        let itemId = uuidv4();
        let whenCreated = Date.now();
        let item = {
            _id: itemId,
            id: itemId,
            staffName: staffName,
            staffEmailid: staffEmailid,
            staffContact: staffContact,
            staffDepartment: staffDepartment,
            trnsctype: trnsctype,
            userID: userID,
            whenCreated: whenCreated
        };
        db.insert(item, (err, result) => {
            if (err) {
                console.log('==Error occurred: ' + err.message, 'create()');
                reject(err);
            } else {
                resolve({ data: { createdId: result.id, createdRevId: result.rev }, statusCode: 201 });
            }
        });
    });
}

/**
 * Create a Walk-in details Entry with the specified attributes
 * 
 * @param {String} walkinbusinessname - Business Name
 * @param {String} walkinDate - Date
 * @param {String} walkinTimeSlot - time slot
 * @param {String} walkinCount - the current persons count
 * @param {String} userID - the ID of the user
 * @param {String} trnsctype - Transaction type which is hard coded as 'StaffDetails' for bookings
 * @return {Promise} - promise that will be resolved (or rejected)
 * when the call to the DB completes
 */
function createWalkinDetails(walkinbusinessname, walkinDate, walkinTimeSlot, walkinCount, trnsctype, userID) {
    return new Promise((resolve, reject) => {
        let itemId = uuidv4();
        let whenCreated = Date.now();
        let item = {
            _id: itemId,
            id: itemId,
            walkinbusinessname: walkinbusinessname,
            walkinDate: walkinDate,
            walkinTimeSlot: walkinTimeSlot,
            walkinCount: walkinCount,
            trnsctype: trnsctype,
            userID: userID,
            whenCreated: whenCreated
        };
        db.insert(item, (err, result) => {
            if (err) {
                console.log('==Error occurred: ' + err.message, 'create()');
                reject(err);
            } else {
                resolve({ data: { createdId: result.id, createdRevId: result.rev }, statusCode: 201 });
            }
        });
    });
}

/**
 * Update a resource with the requested new attribute values
 * 
 * @param {String} id - the ID of the item (required)
 * 
 * The following parameters can be null
 * 
 * @param {String} place - the place of the item
 * @param {String} name - the name of the item
 * @param {String} emailid - the emailid of the item
 * @param {String} person - the person available 
 * @param {String} contact - the contact info 
 * @param {String} userID - the ID of the user 
 * @param {String} datetime - the date of booking
 * @param {String} bookingtime - the timeslot of booking
 * @param {String} trnsctype - the timeslot of booking
 * @return {Promise} - promise that will be resolved (or rejected)
 * when the call to the DB completes
 */
function update(id, place, name, emailid, person, contact, userID, datetime, bookingtime, trnsctype) {
    return new Promise((resolve, reject) => {
        db.get(id, (err, document) => {
            if (err) {
                resolve({statusCode: err.statusCode});
            } else {
                let item = {
                    _id: document._id,
                    _rev: document._rev,            // Specifiying the _rev turns this into an update
                }
                if (place) {item["place"] = place} else {item["place"] = document.place};
                if (name) {item["name"] = name} else {item["name"] = document.name};
                if (emailid) {item["emailid"] = emailid} else {item["emailid"] = document.emailid};
                if (person) {item["person"] = person} else {item["person"] = document.person};
                if (contact) {item["contact"] = contact} else {item["contact"] = document.contact};
                if (userID) {item["userID"] = userID} else {item["userID"] = document.userID};
                if (datetime) {item["datetime"] = datetime} else {item["datetime"] = document.datetime};
                if (bookingtime) {item["bookingtime"] = bookingtime} else {item["bookingtime"] = document.bookingtime};
                if (trnsctype) {item["trnsctype"] = trnsctype} else {item["trnsctype"] = document.trnsctype};
                
                db.insert(item, (err, result) => {
                    if (err) {
                        console.log('Error occurred: ' + err.message, 'create()');
                        reject(err);
                    } else {
                        resolve({ data: { updatedRevId: result.rev }, statusCode: 200 });
                    }
                });
            }            
        })
    });
}

function info() {
    return cloudant.db.get(db_name)
        .then(res => {
            console.log(res);
            return res;
        });
};

module.exports = {
    deleteById: deleteById,
    create: create,
    createB: createB,
    createStaff: createStaff,
    createWalkinDetails: createWalkinDetails,
    update: update,
    find: find,
    info: info
  };