import { Destination } from '../model/Search';
import { SearchRepository } from '../repository/SearchRepository';

export class SearchDestinationsUseCase {
  constructor(private readonly searchRepo: SearchRepository) {}

  execute(): Promise<Destination[]> {
    return this.searchRepo.getDestinations();
  }
}
