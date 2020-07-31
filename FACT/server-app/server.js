require('dotenv').config({silent: true})

const express = require('express');
const bodyParser = require('body-parser');

const assistant = require('./lib/assistant.js');
const port = process.env.PORT || 3000

const cloudant = require('./lib/cloudant.js');

const app = express();
app.use(bodyParser.json());

const testConnections = () => {
  const status = {}
  return assistant.session()
    .then(sessionid => {
      status['assistant'] = 'ok';
      return status
    })
    .catch(err => {
      console.error(err);
      status['assistant'] = 'failed';
      return status
    })
    .then(status => {
      return cloudant.info();
    })
    .then(info => {
      status['cloudant'] = 'ok';
      return status
    })
    .catch(err => {
      console.error(err);
      status['cloudant'] = 'failed';
      return status
    });
};

const handleError = (res, err) => {
  const status = err.code !== undefined && err.code > 0 ? err.code : 500;
  return res.status(status).json(err);
};

app.get('/', (req, res) => {
  testConnections().then(status => res.json({ status: status }));
});

/**
 * Get a session ID
 *
 * Returns a session ID that can be used in subsequent message API calls.
 */
app.get('/api/session', (req, res) => {
  assistant
    .session()
    .then(sessionid => res.send(sessionid))
    .catch(err => handleError(res, err));
});

/**
 * Post process the response from Watson Assistant
 *
 * We want to see if this was a request for resources/supplies, and if so
 * look up in the Cloudant DB whether any of the requested resources are
 * available. If so, we insert a list of the resouces found into the response
 * that will sent back to the client.
 * 
 * We also modify the text response to match the above.
 */
function post_process_assistant(result) {
  let resource
  // First we look to see if a) Watson did identify an intent (as opposed to not
  // understanding it at all), and if it did, then b) see if it matched a supplies entity
  // with reasonable confidence. "supplies" is the term our trained Watson skill uses
  // to identify the target of a question about resources, i.e.:
  //
  // "Where can i find face-masks?"
  //
  // ....should return with an enitity == "supplies" and entitty.value = "face-masks"
  //
  // That's our trigger to do a lookup - using the entitty.value as the name of resource
  // to to a datbase lookup.
  if (result.intents.length > 0 ) {
    result.entities.forEach(item => {
      if ((item.entity == "supplies") &&  (item.confidence > 0.3)) {
        resource = item.value
      }
    })
  }
  if (!resource) {
    return Promise.resolve(result)
  } else {
    // OK, we have a resource...let's look this up in the DB and see if anyone has any.
    return cloudant
      .find('', resource, '')
      .then(data => {
        let processed_result = result
        if ((data.statusCode == 200) && (data.data != "[]")) {
          processed_result["resources"] = JSON.parse(data.data)
          processed_result["generic"][0]["text"] = 'There is' + '\xa0' + resource + " available"
        } else {
          processed_result["generic"][0]["text"] = "Sorry, no" + '\xa0' + resource + " available"           
        }
        return processed_result
      })
  }
}

/**
 * Post a messge to Watson Assistant
 *
 * The body must contain:
 * 
 * - Message text
 * - sessionID (previsoulsy obtained by called /api/session)
 */
app.post('/api/message', (req, res) => {
  const text = req.body.text || '';
  const sessionid = req.body.sessionid;
  console.log(req.body)
  assistant
    .message(text, sessionid)
    .then(result => {
      return post_process_assistant(result)
    })
    .then(new_result => {
      res.json(new_result)
    })
    .catch(err => handleError(res, err));
});

/**
 * Get a list of resources
 *
 * The query string may contain the following qualifiers:
 * 
 * - place
 * - name
 * - userID
 *
 * A list of resource objects will be returned (which can be an empty list)
 */
app.get('/api/resource', (req, res) => {

    const place = req.query.place;
    const name = req.query.name;
    const userID = req.query.userID;
    const trnsctype = req.query.trnsctype;
    const isBookingMand = req.query.isBookingMand;
    cloudant
      .find(place, name, userID, trnsctype, isBookingMand)
      .then(data => {
        if (data.statusCode != 200) {
          res.sendStatus(data.statusCode)
        } else {
          res.send(data.data)
        }
      })
      .catch(err => handleError(res, err));
});

/**
 * Create a new resource
 *
 * The body must contain:
 * 
 * - place
 * - name
 * - contact
 * - userID
 * - datetime
 * - bookingtime
 * - trnsctype
 * The body may also contain:
 * 
 * - emailid
 * - person (which will default to 1 if not included)
 * 
 * The ID and rev of the resource will be returned if successful
 */
//let places = ["Food", "Other", "Help"]
app.post('/api/resource', (req, res) => {

  if (req.body.name){

    if (!req.body.place) {
      return res.status(422).json({ errors: "Type of item must be provided"});
    }
    if (!req.body.name) {
      return res.status(422).json({ errors: "Name of item must be provided"});
    }
    if (!req.body.contact) {
      return res.status(422).json({ errors: "A method of conact must be provided"});
    }
    if (!req.body.datetime) {
      return res.status(422).json({ errors: "Date must be provided"});
    }
    if (!req.body.bookingtime) {
      return res.status(422).json({ errors: "Timeslot must be provided"});
    }
    const place = req.body.place;
    const name = req.body.name;
    const emailid = req.body.emailid || '';
    const userID = req.body.userID || '';
    const person = req.body.person || 1;
    const contact = req.body.contact;
    const datetime = req.body.datetime;
    const bookingtime = req.body.bookingtime;
    const trnsctype = req.body.trnsctype;
  
    cloudant
      .create(place, name, emailid, person, contact, userID, datetime, bookingtime, trnsctype)
      .then(data => {
        if (data.statusCode != 201) {
          res.sendStatus(data.statusCode)
        } else {
          res.send(data.data)
        }
      })
      .catch(err => handleError(res, err));

  } else if (req.body.businessname) {
  
  const businessname = req.body.businessname;
  const openingtime = req.body.openingtime;
  const closingtime = req.body.closingtime || '';
  const userID = req.body.userID || '';
  const personallowed = req.body.personallowed || 1;
  const isBookingMand = req.body.isBookingMand;
  const location = req.body.location || '';
  const trnsctype = req.body.trnsctype;

  cloudant
    .createB(businessname, openingtime, closingtime, personallowed, isBookingMand, location, trnsctype, userID)
    .then(data => {
      if (data.statusCode != 201) {
        res.sendStatus(data.statusCode)
      } else {
        res.send(data.data)
      }
    })
    .catch(err => handleError(res, err));

  } else if (req.body.staffName){

    const staffName = req.body.staffName;
    const staffEmailid = req.body.staffEmailid;
    const staffContact = req.body.staffContact;
    const staffDepartment = req.body.staffDepartment || '';
    const trnsctype = req.body.trnsctype;
    const userID = req.body.userID || '';
    
    cloudant
      .createStaff(staffName, staffEmailid, staffContact, staffDepartment, trnsctype, userID)
      .then(data => {
        if (data.statusCode != 201) {
          res.sendStatus(data.statusCode)
        } else {
          res.send(data.data)
        }
      })
      .catch(err => handleError(res, err));

  } else {

    const walkinbusinessname = req.body.walkinbusinessname;
    const walkinDate = req.body.walkinDate;
    const walkinTimeSlot = req.body.walkinTimeSlot;
    const walkinCount = req.body.walkinCount;
    const trnsctype = req.body.trnsctype;
    const userID = req.body.userID || '';
    
    cloudant
      .createWalkinDetails(walkinbusinessname, walkinDate, walkinTimeSlot, walkinCount, trnsctype, userID)
      .then(data => {
        if (data.statusCode != 201) {
          res.sendStatus(data.statusCode)
        } else {
          res.send(data.data)
        }
      })
      .catch(err => handleError(res, err));

  }

});

/**
 * Update new resource
 *
 * The body may contain any of the valid attributes, with their new values. Attributes
 * not included will be left unmodified.
 * 
 * The new rev of the resource will be returned if successful
 */

app.patch('/api/resource/:id', (req, res) => {
  const place = req.body.place || '';
  const name = req.body.name || '';
  const emailid = req.body.emailid || '';
  const userID = req.body.userID || '';
  const person = req.body.person || '';
  const contact = req.body.contact || '';
  const datetime = req.body.datetime || '';
  const bookingtime = req.body.bookingtime || '';
  const trnsctype = req.body.trnsctype || '';

  cloudant
    .update(req.params.id, place, name, emailid, person, contact, userID, datetime, bookingtime, trnsctype)
    .then(data => {
      if (data.statusCode != 200) {
        res.sendStatus(data.statusCode)
      } else {
        res.send(data.data)
      }
    })
    .catch(err => handleError(res, err));
});

/**
 * Delete a resource
 */
app.delete('/api/resource/:id', (req, res) => {
  cloudant
    .deleteById(req.params.id)
    .then(statusCode => res.sendStatus(statusCode))
    .catch(err => handleError(res, err));
});

const server = app.listen(port, () => {
   const host = server.address().address;
   const port = server.address().port;
   console.log(`SolutionStarterKitCooperationServer listening at http://${host}:${port}`);
});