const urlStr = 'postgresql://postgres:Niharics%402026@127.0.0.1:5432/vet_clinic';
const u = new URL(urlStr);
console.log('Password:', u.password);
console.log('Decoded:', decodeURIComponent(u.password));
