import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { KeysService } from './keys.service';

@ApiTags('Admin - Keys')
@ApiBearerAuth()
@Controller('admin/keys')
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new proxy key for a user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', format: 'uuid' },
        label: { type: 'string', example: 'development' },
      },
    },
  })
  async create(@Body() body: { userId: string; label?: string }) {
    const { key, proxyKey } = await this.keysService.create(body.userId, body.label);
    return {
      key, // plain key - only shown once
      id: proxyKey.id,
      userId: proxyKey.userId,
      label: proxyKey.label,
      createdAt: proxyKey.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all proxy keys' })
  findAll() {
    return this.keysService.findAll();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke and delete a proxy key' })
  remove(@Param('id') id: string) {
    return this.keysService.remove(id);
  }
}
