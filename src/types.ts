export interface User {
  id: string;
  email: string;
  name: string;
  accessToken?: string;
}

export interface DashboardComponent {
  id: string;
  type: 'chart' | 'report' | 'kpi';
  title: string;
  data: any;
  position: number;
}

export interface DashboardState {
  components: DashboardComponent[];
  setComponents: (components: DashboardComponent[]) => void;
}