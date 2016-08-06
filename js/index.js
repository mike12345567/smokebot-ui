var deviceID = "300042001447343338333633";
var accessToken = "";
var funcName = "route";

EventEnum = {
    HEATER : "heater",
    SIGNAL_STRENGTH : "signalStrength",
    TEMPERATURES : "temperatures",
}

ButtonEnum = {
    MAIN_HEATER_ON : {cmd: "heaterControl,MAIN_HEATER", btnName: "main-heater-on"},
    MAIN_HEATER_OFF : {cmd: "heaterControl,MAIN_HEATER", btnName: "main-heater-off"},
    START_COOK : {cmd: "setTargetTemperature", btnName: "start-cook-btn"},
    STOP_COOK : {cmd: "setTargetTemperature", btnName: "stop-cook-btn"},
}

TempRolesEnum = {
    INTERNAL_TEMP : {output: "internal-temp-output", role: 1 << 0},
    MEAT_ONE_TEMP : {output: "meat1-temp-output", role: 1 << 1},
    MEAT_TWO_TEMP : {output: "meat2-temp-output", role: 1 << 2},
}

InputEnum = {
    TARGET_TEMP : "target-temp-input",
    SIGNAL_STRENGTH : "signal-strength-output",
}

$(document).ready(function() {
    if (accessToken == "" || deviceID == "") {
        alert("Please open index.js and input a valid 'accessToken' and 'deviceID'."+
                 "\nThe token must pertain to the account with ownership of the robot."+
                 "\nIf ownership is not known please contact me@michaeldrury.co.uk for details on taking ownership.");
        window.close();
    }

    spark.login({accessToken: accessToken});
    spark.getEventStream(false, deviceID, function(data) {
        switch (data.name) {
            case EventEnum.HEATER:
                var array = base64js.toByteArray(data.data);
                var on = getValue(array, 0) == 1;
                if (on) {
                    $("#" + ButtonEnum.MAIN_HEATER_OFF.btnName).removeClass("btn-danger").addClass("btn-default");
                    $("#" + ButtonEnum.MAIN_HEATER_ON.btnName).removeClass("btn-default").addClass("btn-danger");
                } else {
                    $("#" + ButtonEnum.MAIN_HEATER_OFF.btnName).removeClass("btn-default").addClass("btn-danger");                   
                    $("#" + ButtonEnum.MAIN_HEATER_ON.btnName).removeClass("btn-danger").addClass("btn-default");
                }
                break;
            case EventEnum.SIGNAL_STRENGTH:
                var array = base64js.toByteArray(data.data);
                var value = getValue(array, 0) - 0x10000;;
                setInput(InputEnum.SIGNAL_STRENGTH, value);
                break;
            case EventEnum.TEMPERATURES:
                var array = base64js.toByteArray(data.data);
                outputTemperatures(array);
                break;
        }
    });

    for (var btnEnumStr in ButtonEnum) {
        var button = ButtonEnum[btnEnumStr];
        $("#" + button.btnName).click(function(event) {
            var name = event.target.id;
            
            if (name == ButtonEnum.MAIN_HEATER_ON.btnName) {
                particleCall(getCmd(name), "on");
            }
            
            if (name == ButtonEnum.MAIN_HEATER_OFF.btnName) {
                particleCall(getCmd(name), "off");
            }
            
            if (name == ButtonEnum.START_COOK.btnName) {
                var temp = getInput(InputEnum.TARGET_TEMP);
                if (temp == null) return;
                particleCall(getCmd(name), temp);
            }
            
            if (name == ButtonEnum.STOP_COOK.btnName) {
                particleCall(getCmd(name), "0");
            }
        });
    }
});

function getRole(array, i) {
    return (array[i] | array[i+1] << 8);
}

function getValue(array, i) {
    return (array[i+2] | array[i+3] << 8);
}

function outputTemperatures(array) {
    for (var i = 0; i < array.length; i+=4) {
        var role = getRole(array, i);
        var value = getValue(array, i) / 100;

        for (var tempRoleStr in TempRolesEnum) {
            var tempRole = TempRolesEnum[tempRoleStr];

            if (tempRole.role == role) {
                setInput(tempRole.output, value);
                break;
            }
        }
    }
}

function getCmd(btnName) {
    for (var btnEnumStr in ButtonEnum) {
        var button = ButtonEnum[btnEnumStr];
        if (button.btnName == btnName) {
            return button.cmd;
        }
    }
    return null;
}

function particleCall(cmd, parameters) {
    var data;
    if (particleCall.length == 1 && cmd != null) {
        data = cmd;
    } else {
        data = cmd;
        for (var arg = 1; arg < arguments.length; arg++) {
            if (arguments[arg] == null) continue;
            data += "," + arguments[arg];
        }
    }
    $.post("https://api.particle.io/v1/devices/"+deviceID+"/"+funcName, {arg: data, access_token: accessToken})
        .done(function(data) {
            
        });
}

function getInput(inputName) {
    var value;
    value = $("#" + inputName).val();
    if (value == "") value = null;
    return value;
}

function setInput(inputName, value) {
    $("#" + inputName).val(value);
}


