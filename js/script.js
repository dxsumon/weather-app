// API Configuration
const API_KEY = '44108746d76cf6b679cb070cc44e1675';
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API_BASE = 'https://api.openweathermap.org/data/2.5/forecast';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherCard = document.getElementById('weatherCard');
const loadingAnimation = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Weather Information Elements
const cityNameElement = document.getElementById('cityName');
const dateTimeElement = document.getElementById('dateTime');
const temperatureElement = document.getElementById('temperature');
const weatherConditionElement = document.getElementById('weatherCondition');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('windSpeed');
const weatherIconElement = document.getElementById('weatherIcon');
const yesterdayTempElement = document.getElementById('yesterdayTemp');
const tomorrowTempElement = document.getElementById('tomorrowTemp');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Show initial loading spinner
    showLoading();
    setTimeout(() => {
        hideLoading();
        // Load last searched city from localStorage
        const lastCity = localStorage.getItem('lastCity');
        if (lastCity) {
            cityInput.value = lastCity;
            getWeatherData(lastCity);
        }
    }, 1000);
});

function showEmptyInputError() {
    errorMessage.textContent = 'Please enter a city name';
    errorMessage.style.display = 'block';
    weatherCard.style.display = 'none';
    
    // Show error for 3 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
        errorMessage.textContent = 'City not found. Please try again.'; // Reset error message
    }, 3000);
}

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    } else {
        showEmptyInputError();
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        } else {
            showEmptyInputError();
        }
    }
});

// Helper Functions
function showLoading() {
    loadingAnimation.style.display = 'flex';
    weatherCard.style.display = 'none';
    errorMessage.style.display = 'none';
}

function hideLoading() {
    loadingAnimation.style.display = 'none';
}

function showError() {
    errorMessage.style.display = 'block';
    weatherCard.style.display = 'none';
    
    // Show error for 3 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 3000);
}

function updateBackgroundColor(weatherCondition) {
    // Remove any existing weather effects or classes
    const existingEffect = document.querySelector('.weather-effect');
    if (existingEffect) {
        existingEffect.remove();
    }
    
    // Remove any weather-related classes
    document.body.classList.remove('clear-sky', 'clouds', 'rain', 'snow', 'thunderstorm');
    
    // Clear any previously set background styles
    document.body.style.background = '';
    document.body.style.filter = '';
    
    // Keep only the original background image
    document.body.style.backgroundImage = "url('../images/login-bg.jpg')";
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
}

function updateDateTime() {
    const now = new Date();
    dateTimeElement.textContent = now.toLocaleString();
}

// Main Weather Data Fetching Function
async function getWeatherData(city) {
    showLoading();

    try {
        // Parallel fetch requests with minimum loading time of 1.5 seconds
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(`${WEATHER_API_BASE}?q=${city}&appid=${API_KEY}&units=metric`),
            fetch(`${FORECAST_API_BASE}?q=${city}&appid=${API_KEY}&units=metric`),
            new Promise(resolve => setTimeout(resolve, 1500)) // 1.5 second delay
        ]);

        if (!weatherResponse.ok) throw new Error('City not found');
        
        const [weatherData, forecastData] = await Promise.all([
            weatherResponse.json(),
            forecastResponse.json()
        ]);

        // Update UI
        updateWeatherUI(weatherData, forecastData);
        
        // Save to localStorage
        localStorage.setItem('lastCity', city);
        
        // Show weather card
        weatherCard.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Update background and weather effects
        updateBackgroundColor(weatherData.weather[0].main);
        
        // Clear search input after successful search
        cityInput.value = '';
        
    } catch (error) {
        showError();
    } finally {
        hideLoading();
    }
}

// Update UI with Weather Data
function updateWeatherUI(weatherData, forecastData) {
    // Update current weather
    cityNameElement.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
    temperatureElement.textContent = `${Math.round(weatherData.main.temp)}°C`;
    weatherConditionElement.textContent = weatherData.weather[0].description;
    humidityElement.textContent = `${weatherData.main.humidity}%`;
    windSpeedElement.textContent = `${(weatherData.wind.speed * 3.6).toFixed(1)} km/h`;
    
    // Update weather icon
    const iconCode = weatherData.weather[0].icon;
    weatherIconElement.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    
    // Update date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Update forecast temperatures
    const today = new Date();
    const tomorrow = forecastData.list.find(item => {
        const itemDate = new Date(item.dt * 1000);
        const isNextDay = itemDate.getDate() === today.getDate() + 1 || 
                         (today.getDate() === itemDate.getMonth() === today.getMonth() ? 1 : itemDate.getDate());
        return isNextDay;
    });

    // Update tomorrow's temperature
    if (tomorrow) {
        tomorrowTempElement.textContent = `${Math.round(tomorrow.main.temp)}°C`;
    } else {
        // If no specific forecast found, use the next available forecast
        if (forecastData.list.length > 0) {
            tomorrowTempElement.textContent = `${Math.round(forecastData.list[0].main.temp)}°C`;
        } else {
            tomorrowTempElement.textContent = 'N/A';
        }
    }
    
    // Since we can't get yesterday's weather from the API, we'll show today's min temperature instead
    yesterdayTempElement.textContent = `${Math.round(weatherData.main.temp_min)}°C`;

    // Update 5-day forecast
    updateFiveDayForecast(forecastData);
}

// Function to update 5-day forecast
function updateFiveDayForecast(forecastData) {
    const forecastContainer = document.querySelector('.forecast-container');
    forecastContainer.innerHTML = ''; // Clear existing forecast

    const dailyForecasts = new Map();
    
    // Group forecasts by day
    forecastData.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        if (!dailyForecasts.has(dateStr)) {
            dailyForecasts.set(dateStr, {
                date: dateStr,
                icon: forecast.weather[0].icon,
                temp: forecast.main.temp,
                condition: forecast.weather[0].description,
                temps: [forecast.main.temp]
            });
        } else {
            dailyForecasts.get(dateStr).temps.push(forecast.main.temp);
        }
    });

    // Get first 5 days
    let count = 0;
    for (let [dateStr, forecast] of dailyForecasts) {
        if (count >= 5) break;
        
        // Calculate average temperature for the day
        const avgTemp = forecast.temps.reduce((a, b) => a + b, 0) / forecast.temps.length;
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="date">${forecast.date}</div>
            <img src="https://openweathermap.org/img/wn/${forecast.icon}@2x.png" alt="Weather Icon">
            <div class="temp">${Math.round(avgTemp)}°C</div>
            <div class="condition">${forecast.condition}</div>
        `;
        
        forecastContainer.appendChild(forecastCard);
        count++;
    }
}