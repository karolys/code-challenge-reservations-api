const express = require('express');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server is listening on Port ${PORT}`);
});

app.post("/api/v0/appointments/providers/availability", (req, res, next) => {
    // TODO: Implement Provider availability submission

    const response = {
        info: "Provider availability submission not yet implemented"
    };

    res.send(response);
});

app.get("/api/v0/appointments/providers/availability", (req, res, next) => {
    // TODO: Implement Provider availability list endpoint

    const response = {
        info: "Provider availability list endpoint not yet implemented"
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