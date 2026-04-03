import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { AuthUserDto } from '../auth/dto';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: AuthUserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@Req() req: any) {
    const user = await this.userService.findById(req.user.id);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
  }
}
