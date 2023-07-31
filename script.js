"use strict";

// prettier-ignore

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

// Planning
// User-Stories---> Features ----> FlowChart ---> Architecture

// User-Stories ---> Bring yourself in user's shoes

// /**
//  *  Features---> 1. Adding workout
//  *               2. Form to input dist,time,pace,steps/min
//  *               3. Local storage
//  *    And many things....................
//  *
// /

// geolocation API

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = (this.distance * 60) / this.duration;
    return this.speed;
  }
}

const run = new Running([39, 12], 5.2, 24, 178);
const cycle = new Cycling([39, 12], 5.2, 24, 178);

console.log(run);
console.log(cycle);
/////////////////////////////////////////////////
//////////////////////////////////////////////////
// Application Architecture
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    // Get position
    this._getPosition();
    // Get data from local Storage
    this._getLocalStorage();
    // Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this)); // this keyword should be changed to this otherwise its form DOM
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation?.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        // Bind loadmap to this ptherwise it will be treated as normal function
        alert("Could not get the position");
      }
    ); // [successCallback,errorCallback]
  }

  _loadMap(position) {
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(
      `https://www.google.com/maps/@${latitude},${longitude},15z?entry=ttu`
    );

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, 13); // zoom level
    // L is the namespace
    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // map is an object prototype provided by leaflet
    // console.log(map);

    // Handling clicks on map
    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideform() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    // Listen to change
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    const validInput = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
    console.log(this.#mapEvent);

    const clearFields = function () {
      inputDistance.value =
        inputCadence.value =
        inputDuration.value =
        inputElevation.value =
          "";
    };
    // listen form submit
    e.preventDefault();

    // Get data from form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout is running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // Check validity of data
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        clearFields();
        return alert("Inputs have to be positive number");
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout is cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      // Check validity of data
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(duration, distance)
      ) {
        clearFields();
        return alert("Inputs have to be positive number");
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to the workout array
    this.#workouts.push(workout);
    console.log(workout);
    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);
    // Hide form
    this._hideform();

    // Set localStorage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
    // Clear input fields
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        "";
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === "running")
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === "cycling")
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workOutEl = e.target.closest(".workout");
    // console.log(workOutEl);
    if (!workOutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workOutEl.dataset.id
    );
    // console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using the public interface;
    // workout.click();
  }

  _setLocalStorage() {
    // localStorage is blocking and it should store small amount of data
    localStorage.setItem("workouts", JSON.stringify(this.#workouts)); // convert object to string
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts")); // Prototype chain is lost
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work);---> Error--> since map is noy yet loaded
    });
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload(); // reloads the page
  }
}

const app = new App();

// Leaflet
// CDN----> Content Delivery Network--> hosted for third-party servicing

// console.log(firstName);-->global
