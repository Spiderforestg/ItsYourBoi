// Follow the device's local calendar and clock; no location or weather access.
export function getRoomScene(date = new Date()) {
  const hour = date.getHours();
  const time = hour >= 5 && hour < 9 ? 'morning'
    : hour >= 9 && hour < 17 ? 'day'
      : hour >= 17 && hour < 20 ? 'evening' : 'night';
  // Northern hemisphere calendar seasons.
  const month = date.getMonth();
  const season = month >= 2 && month <= 4 ? 'spring'
    : month >= 5 && month <= 7 ? 'summer'
      : month >= 8 && month <= 10 ? 'autumn' : 'winter';
  return { time, season };
}
