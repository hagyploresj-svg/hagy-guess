/**
 * Dünya genelinde tohum noktaları [ad, enlem, boylam].
 * Mapillary kapsaması düzensiz olduğundan tamamen rastgele koordinat yerine,
 * kapsama ihtimali yüksek şehir/bölgeler etrafında rastgele sapma uygulanır.
 */
export const SEEDS: [string, number, number][] = [
  // Avrupa
  ['Londra',51.5,-0.12],['Manchester',53.48,-2.24],['Dublin',53.35,-6.26],['Paris',48.86,2.35],['Lyon',45.76,4.84],
  ['Marsilya',43.3,5.37],['Madrid',40.42,-3.7],['Barselona',41.39,2.17],['Sevilla',37.39,-5.98],['Lizbon',38.72,-9.14],
  ['Porto',41.15,-8.61],['Roma',41.9,12.5],['Milano',45.46,9.19],['Napoli',40.85,14.27],['Berlin',52.52,13.4],
  ['Münih',48.14,11.58],['Hamburg',53.55,9.99],['Amsterdam',52.37,4.9],['Brüksel',50.85,4.35],['Zürih',47.37,8.54],
  ['Viyana',48.21,16.37],['Prag',50.08,14.44],['Varşova',52.23,21.01],['Krakow',50.06,19.94],['Budapeşte',47.5,19.04],
  ['Bükreş',44.43,26.1],['Sofya',42.7,23.32],['Atina',37.98,23.73],['Selanik',40.64,22.94],['Belgrad',44.79,20.45],
  ['Zagreb',45.81,15.98],['Ljubljana',46.05,14.5],['Bratislava',48.15,17.11],['Kopenhag',55.68,12.57],['Stockholm',59.33,18.07],
  ['Göteborg',57.71,11.97],['Oslo',59.91,10.75],['Helsinki',60.17,24.94],['Tallinn',59.44,24.75],['Riga',56.95,24.11],
  ['Vilnius',54.69,25.28],['Reykjavik',64.15,-21.94],['Kiev',50.45,30.52],['İstanbul',41.01,28.98],['Ankara',39.93,32.86],
  ['İzmir',38.42,27.14],['Antalya',36.9,30.7],['Moskova',55.76,37.62],['St. Petersburg',59.93,30.34],['Tiflis',41.72,44.79],
  ['Erivan',40.18,44.51],['Bakü',40.41,49.87],
  // Asya & Orta Doğu
  ['Tokyo',35.68,139.69],['Osaka',34.69,135.5],['Sapporo',43.06,141.35],['Seul',37.57,126.98],['Busan',35.18,129.08],
  ['Taipei',25.03,121.56],['Bangkok',13.76,100.5],['Chiang Mai',18.79,98.98],['Hanoi',21.03,105.85],['Ho Chi Minh',10.78,106.7],
  ['Kuala Lumpur',3.14,101.69],['Singapur',1.35,103.82],['Cakarta',-6.2,106.85],['Surabaya',-7.25,112.75],['Manila',14.6,120.98],
  ['Cebu',10.32,123.89],['Delhi',28.61,77.21],['Mumbai',19.08,72.88],['Bangalore',12.97,77.59],['Kalküta',22.57,88.36],
  ['Dakka',23.81,90.41],['Kolombo',6.93,79.86],['Katmandu',27.7,85.32],['Almatı',43.24,76.89],['Taşkent',41.3,69.24],
  ['Ulan Batur',47.89,106.91],['Dubai',25.2,55.27],['Tel Aviv',32.09,34.78],['Amman',31.95,35.93],['Riyad',24.71,46.68],
  // Afrika
  ['Kahire',30.04,31.24],['Kazablanka',33.57,-7.59],['Tunus',36.8,10.18],['Lagos',6.52,3.38],['Accra',5.6,-0.19],
  ['Dakar',14.72,-17.47],['Nairobi',-1.29,36.82],['Addis Ababa',9.03,38.74],['Kampala',0.35,32.58],['Dar es Salaam',-6.79,39.21],
  ['Johannesburg',-26.2,28.05],['Cape Town',-33.92,18.42],['Durban',-29.86,31.02],['Windhoek',-22.56,17.08],['Maputo',-25.97,32.57],
  ['Antananarivo',-18.88,47.51],
  // Amerika
  ['New York',40.71,-74.0],['Los Angeles',34.05,-118.24],['Chicago',41.88,-87.63],['Houston',29.76,-95.37],['Seattle',47.61,-122.33],
  ['Denver',39.74,-104.99],['Miami',25.76,-80.19],['Atlanta',33.75,-84.39],['Anchorage',61.22,-149.9],['Toronto',43.65,-79.38],
  ['Vancouver',49.28,-123.12],['Montreal',45.5,-73.57],['Calgary',51.05,-114.07],['Mexico City',19.43,-99.13],['Guadalajara',20.67,-103.35],
  ['Guatemala',14.63,-90.51],['San José (CR)',9.93,-84.08],['Panama',8.98,-79.52],['Bogota',4.71,-74.07],['Medellín',6.24,-75.58],
  ['Quito',-0.18,-78.47],['Lima',-12.05,-77.04],['La Paz',-16.5,-68.15],['Santiago',-33.45,-70.67],['Buenos Aires',-34.6,-58.38],
  ['Córdoba',-31.42,-64.18],['Montevideo',-34.9,-56.16],['Asunción',-25.26,-57.58],['São Paulo',-23.55,-46.63],['Rio',-22.91,-43.17],
  ['Brasília',-15.78,-47.93],['Salvador',-12.97,-38.5],['Santo Domingo',18.49,-69.93],
  // Okyanusya
  ['Sidney',-33.87,151.21],['Melbourne',-37.81,144.96],['Brisbane',-27.47,153.03],['Perth',-31.95,115.86],['Adelaide',-34.93,138.6],
  ['Auckland',-36.85,174.76],['Wellington',-41.29,174.78],['Christchurch',-43.53,172.64],
];
