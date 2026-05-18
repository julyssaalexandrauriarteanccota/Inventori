import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolUsuario, type AuthUser } from "@erp/shared";

// --- Mocks ---

const mockUser: AuthUser = {
  id: "1",
  nombre: "Admin",
  apellido: "Test",
  email: "admin@test.com",
  rol: RolUsuario.ADMIN,
  mustChangePassword: false,
};

let mockPathname = "/dashboard";
const mockRouterPush = vi.fn();
const mockOpenSettings = vi.fn();

const useAuthReturn = {
  user: mockUser as AuthUser | null,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn(),
};

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => useAuthReturn,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("@/lib/erp-navigation", () => ({
  getNavigationForRole: (rol: string) => {
    if (rol === "ADMIN") {
      return [
        { title: "Dashboard", url: "/dashboard", description: "", roles: [] },
        { title: "Clientes", url: "/clientes", description: "", roles: [] },
        { title: "Servicios", url: "/servicios", description: "", roles: [] },
        { title: "Reportes", url: "/reportes", description: "", roles: [] },
      ];
    }
    if (rol === "TECNICO") {
      return [
        { title: "Dashboard", url: "/dashboard", description: "", roles: [] },
        { title: "Soporte", url: "/soporte", description: "", roles: [] },
      ];
    }
    return [
      { title: "Dashboard", url: "/dashboard", description: "", roles: [] },
    ];
  },
}));

// Mock sidebar UI primitives to simple divs
vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar">{children}</div>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarRail: () => <div />,
  SidebarSeparator: () => <hr />,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuSub: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuSubButton: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuSubItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useSidebar: () => ({ isMobile: false }),
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuRadioGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuRadioItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

vi.mock("@/components/settings-dialog-provider", () => ({
  SettingsDialogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSettingsDialog: () => ({
    isOpen: false,
    activeSection: "preferencias",
    openSettings: mockOpenSettings,
    closeSettings: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { AppSidebar } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";

describe("AppSidebar", () => {
  beforeEach(() => {
    useAuthReturn.user = mockUser;
    useAuthReturn.isAuthenticated = true;
    mockPathname = "/dashboard";
    mockRouterPush.mockReset();
  });

  it("muestra items de navegacion filtrados por rol ADMIN", () => {
    useAuthReturn.user = { ...mockUser, rol: RolUsuario.ADMIN };

    render(<AppSidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Servicios")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
  });

  it("mantiene Servicios antes de Reportes para ADMIN", () => {
    useAuthReturn.user = { ...mockUser, rol: RolUsuario.ADMIN };

    render(<AppSidebar />);

    const links = screen.getAllByRole("link").map((link) => link.textContent);

    expect(links.indexOf("Servicios")).toBeGreaterThanOrEqual(0);
    expect(links.indexOf("Reportes")).toBeGreaterThanOrEqual(0);
    expect(links.indexOf("Servicios")).toBeLessThan(links.indexOf("Reportes"));
  });

  it("muestra solo items permitidos para rol TECNICO", () => {
    useAuthReturn.user = { ...mockUser, rol: RolUsuario.TECNICO };

    render(<AppSidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Ventas")).not.toBeInTheDocument();
    expect(screen.getByText("Soporte")).toBeInTheDocument();
    expect(screen.queryByText("Reportes")).not.toBeInTheDocument();
  });

  it("muestra boton de Ajustes solo para ADMIN", () => {
    useAuthReturn.user = { ...mockUser, rol: RolUsuario.ADMIN };

    render(<AppSidebar />);

    expect(screen.getByText("Ajustes")).toBeInTheDocument();
  });

  it("oculta boton de Ajustes para TECNICO", () => {
    useAuthReturn.user = { ...mockUser, rol: RolUsuario.TECNICO };

    render(<AppSidebar />);

    expect(screen.queryByText("Ajustes")).not.toBeInTheDocument();
  });

  it("muestra el menu contextual de configuracion al entrar en /configuracion", () => {
    mockPathname = "/configuracion";
    useAuthReturn.user = { ...mockUser, rol: RolUsuario.ADMIN };

    render(<AppSidebar />);

    expect(screen.getByText("Volver")).toBeInTheDocument();
    expect(screen.getAllByText("Empresa").length).toBeGreaterThan(0);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});

describe("NavUser", () => {
  beforeEach(() => {
    useAuthReturn.user = mockUser;
    useAuthReturn.isAuthenticated = true;
    mockOpenSettings.mockReset();
  });

  it("muestra nombre completo y rol del usuario", () => {
    render(<NavUser />);

    expect(screen.getAllByText("Admin Test").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Administrador").length).toBeGreaterThan(0);
  });

  it("muestra iniciales del usuario en avatar", () => {
    render(<NavUser />);

    expect(screen.getAllByText("AT").length).toBeGreaterThan(0);
  });

  it("muestra label correcto para cada rol", () => {
    useAuthReturn.user = {
      ...mockUser,
      nombre: "Juan",
      apellido: "Lopez",
      rol: RolUsuario.TECNICO,
    };

    render(<NavUser />);

    expect(screen.getAllByText("Tecnico").length).toBeGreaterThan(0);
  });

  it("usa avatar y cargo actualizados cuando el perfil los tiene", () => {
    useAuthReturn.user = {
      ...mockUser,
      cargo: "Soporte técnico",
      avatarUrl: "/uploads/public/avatar-admin.webp",
    };

    render(<NavUser />);

    expect(screen.getAllByText("Soporte técnico").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("Admin Test").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("Admin Test")[0]).toHaveAttribute(
      "src",
      expect.stringContaining("avatar-admin.webp"),
    );
  });

  it("abre ajustes en perfil al hacer clic en Mi perfil", () => {
    render(<NavUser />);

    fireEvent.click(screen.getByRole("button", { name: /mi perfil/i }));

    expect(mockOpenSettings).toHaveBeenCalledWith("perfil");
  });

  it("abre ajustes en soporte al hacer clic en Ayuda y soporte", () => {
    render(<NavUser />);

    fireEvent.click(screen.getByRole("button", { name: /ayuda y soporte/i }));

    expect(mockOpenSettings).toHaveBeenCalledWith("soporte");
  });

  it("no renderiza nada si no hay usuario", () => {
    useAuthReturn.user = null;

    const { container } = render(<NavUser />);

    expect(container.innerHTML).toBe("");
  });
});
