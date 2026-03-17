import { anAccount } from '../../../test/support/factories';
import { AccountEntity } from '../../database/entities';
import { EndOfDayJob, JobReport } from './end-of-day.template-method';

class RecordingJob extends EndOfDayJob {
  readonly name = 'recording';
  readonly calls: string[] = [];
}
