import 'multer';
import { RolUsuario } from '@erp/shared';

declare global {
  namespace Express {
    interface User {
      sub: string;
      email: string;
      rol: RolUsuario;
    }
  }
}
