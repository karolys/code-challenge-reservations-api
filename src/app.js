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
    // TODO: Implement Provider availability submission
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
    // TODO: Unify/Clarify DateTime handling, currently submitted in Local Time on POST and converted to UTC on insert, and returned in UTC on GET
    const response = {
        status: (submissionStatus)? "Availability successfully updated." : "Availability updated failed, please try again."
    };

    res.send(response);
});

app.get("/api/v0/appointments/providers/availability", async (req, res, next) => {
    // TODO: Implement Provider availability list endpoint
    // Optional Matrix Parameter of Provider ID on which to filter

    let availableAppointmentTimes = await appointmentsManagerService.retrieveAllAppointmentSlotsByProviderId();

    const response = {
        data: availableAppointmentTimes
    };

    res.send(response);
});

app.post("/api/v0/appointments/clients/reserve", (req, res, next) => {
    // TODO: Implement Client reserve appointment endpoint

    const response = {
        info: "Client appointment reservation not yet implemented"
    };

    res.send(response);
});

app.post("/api/v0/appointments/clients/confirm", (req, res, next) => {
    // TODO: Implement Client appointment confirmation

    const response = {
        info: "Client appointment confirmation not yet implemented"
    };

    res.send(response);
});

//TODO: Added 404 path not found error handling, and potentially other cases