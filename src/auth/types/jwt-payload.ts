export interface JwtPayload {
  sub: string;
  email: string;
  restaurantId: string;
  iat?: number;
  exp?: number;
}
