import Planner from '@/components/Planner';
import { demoItems } from '@/lib/demo-data';

export default function Home() {
  return <Planner initialItems={demoItems} />;
}
