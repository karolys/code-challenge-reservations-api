const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const appointmentsManagerService = require('./services/appointments_manager_service');

const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server is listening on Port ${PORT}`);
});

app.post("/api/v0/appointments/providers/availability", async(req, res, next) => {
    // We can/should take provider name/id here, though unspecified the base case is seemingly a client scheduling any provider available,
    // doesn't necessarily have to be a specific one. Will add filter time permitted

    // We will have the possibility of two users trying to select the same appointment time with the current DB Schema,
    // need to also create an unconfirmed reservation id and update/track to prevent collisions

    /* Preliminary availability submission data structure
    * {
          "provider_id": 1,
          "availability": {
            "8-13-2023": [{
              "startTime": 8,
              "endTime": 11.5
            }, {
              "startTime": 12,
              "endTime": 17
            }],
            "8-14-2023" : [{
              "startTime": 10,
              "endTime": 16
            }]
          }
        }
    * */

    const requestBody = req.body;
    let providerId = (requestBody.hasOwnProperty("providerId"))? requestBody.providerId : null;
    let providerAvailabilityMap = (requestBody.hasOwnProperty("availability"))? requestBody.availability : null;

    let submissionStatus = await appointmentsManagerService.updateAppointmentAvailabilityByProviderId(providerId, providerAvailabilityMap);

    // Need to validate no time zone shenanigans are happening, initial glance there appears to be a discrepancy despite being correctly inserted
    // Confirmed with additional testing it appears Timezones are being converted to UTC on insertion
    // TODO: Unify/Clarify DateTime handling, currently submitted in Local Time on POST and seemingly converted to UTC on insert, and returned in UTC on GET
    const response = {
        status: (submissionStatus)? "Availability successfully updated." : "Availability updated failed, please try again."
    };

    res.send(response);
});

app.get("/api/v0/appointments/providers/availability", async (req, res, next) => {
    // Optional Matrix Parameter of Provider ID on which to filter

    let availableAppointmentTimes = await appointmentsManagerService.retrieveAllAppointmentSlotsByProviderId();

    const response = {
        data: availableAppointmentTimes
    };

    res.send(response);
});

app.post("/api/v0/appointments/clients/reserve", async(req, res, next) => {
    // { appointmentId: 1, clientEmail: "test.email@gmail.com" }
    const requestBody = req.body;
    let appointmentId = (requestBody.hasOwnProperty("appointmentId"))? requestBody.appointmentId : -1;
    let clientEmail = (requestBody.hasOwnProperty("clientEmail"))? requestBody.clientEmail : null;

    // Validate here to ensure we have a valid appointmentId and clientEmail
    let reservationObject = await appointmentsManagerService.reserveAppointmentSlotByAppointmentId(appointmentId, clientEmail);

    //Need to accept data structure that contains appointment time information
    // Check to see if it's available, if not error
    // Check to see if it exists in the temp table, if it does and hasn't been reservered and the time created is greater than 30 mins overwrite/delete and reinsert
    // - Also need to update Appointments table to contain unconfirmed appointment ID
    // Need to return ID of unconfirmed appointment which then needs to be passed to the confirmation endpoint within 30 minutes to lock in APT

    const response = {
        "reservation": reservationObject
    };

    res.send(response);
});

app.post("/api/v0/appointments/clients/confirm/:apptId", async(req, res, next) => {
    //Need to accept a path parameter and data structure containing true/false for reservation confirmation
    // If path parameter unconfirmed appt doesn't exist, error
    // If appointment id is expired (older than 30 mins), return failure and clear DB if needed
    // If appointment ID is not found, return failure
    // If appointment post status isCanceled remove from t_unconfirmed_appointments, and update time slot in t_appointment_availability
    // If appointment post status isConfirmed remove from t_unconfirmed_appointments, insert into t_reservations, update time slot in t_appointment_availability

    const unconfirmedApptId = req.params.apptId;

    let confirmationStatus = await appointmentsManagerService.confirmAppointmentSlotByAppointmentId(unconfirmedApptId);

    const response = {
        status: (confirmationStatus)? "Thank you, your appointment is confirmed!" : "We're sorry, your appointment couldn't be confirmed."
    };

    res.send(response);
});

//TODO: Added 404 path not found error handling, and potentially other cases