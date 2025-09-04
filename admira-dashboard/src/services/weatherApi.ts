interface WeatherApiResponse {
  id: string;
  city: string;
  temperature: number;
  humidity: number;
  heatIndex: number;
  date: string;
}

interface WeatherApiParams {
  startDate?: string;
  endDate?: string;
  cities?: string[];
  limit?: number;
}

class WeatherApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }

  async getWeatherData(params: WeatherApiParams = {}): Promise<WeatherApiResponse[]> {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.cities && params.cities.length > 0) {
      queryParams.append('cities', params.cities.join(','));
    }
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `${this.baseUrl}/weather?${queryParams.toString()}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }

  async getWeatherById(id: string): Promise<WeatherApiResponse> {
    const url = `${this.baseUrl}/weather/${id}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching weather data by ID:', error);
      throw error;
    }
  }

  async getCities(): Promise<string[]> {
    const url = `${this.baseUrl}/cities`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  }
}

export const weatherApi = new WeatherApiService();
export default weatherApi;
