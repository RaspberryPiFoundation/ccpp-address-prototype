export interface VenueAddress {
  addressLine1: string
  addressLine2: string
  townCity: string
  county: string
  postcode: string
  coordinates: string
}

export interface ApplicationData {
  country: string
  venueType: string
  confirmedAdult: boolean
  venueName: string
  address: VenueAddress
  locationDescription: string
  confirmedPermission: boolean
}

export const emptyApplication: ApplicationData = {
  country: '',
  venueType: '',
  confirmedAdult: false,
  venueName: '',
  address: {
    addressLine1: '',
    addressLine2: '',
    townCity: '',
    county: '',
    postcode: '',
    coordinates: '',
  },
  locationDescription: '',
  confirmedPermission: false,
}
