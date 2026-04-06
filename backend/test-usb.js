const usb = require("usb");

const devices = usb.getDeviceList();
console.log("DISPOSITIVOS USB DETECTADOS:");
devices.forEach(d => {
  console.log(d.deviceDescriptor);
});
