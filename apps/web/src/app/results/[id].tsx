import { useLocalSearchParams } from 'expo-router';
import { ResultInsightScreen } from '../../components/results-screen';

export default function ResultDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  return <ResultInsightScreen id={String(params.id ?? '')} />;
}